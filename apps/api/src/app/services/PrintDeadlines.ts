import { AccountRole } from '@app/models/AccountRole'
import { Board } from '@app/models/Board'
import { Booking } from '@app/models/Booking'
import { OwnerProfile } from '@app/models/OwnerProfile'
import { PrintJob } from '@app/models/PrintJob'
import { PrintJobMiss, type PrintJobMissStage } from '@app/models/PrintJobMiss'
import { User } from '@app/models/User'
import { AccountMail } from '@app/notifications/AccountMail'
import { Day } from '@app/support/Day'
import { Settings } from '@app/support/Settings'
import { Sms } from '@app/support/Sms'
import { StoredImage } from '@app/support/StoredImage'
import { Reputation } from './Reputation'

/** Jobs handled per run, so one run stays short. */
const BATCH = 100

const REASONS: Record<PrintJobMissStage, string> = {
  print: 'the photo of the finished print didn’t come in on time',
  post: 'the ad wasn’t up by its go-live date',
}

/**
 * Keeps print jobs on time. A dispatcher who misses the print or go-live date loses the
 * job, which goes back to others (with a bonus when go-live is close); too many misses
 * suspend them. Whoever looks after a board is warned when its job has no taker close to go-live.
 */
export class PrintDeadlines {
  /** One pass of the schedule. */
  static async run(): Promise<{ missed: number; alerted: number }> {
    const missed = (await PrintDeadlines.missPrints()) + (await PrintDeadlines.missPosts())
    const alerted = await PrintDeadlines.alertUnclaimed()

    return { missed, alerted }
  }

  /** Confirmed jobs with no print photo by `print_by_days` before go-live. */
  private static async missPrints(): Promise<number> {
    const days = await Settings.number('printing.print_by_days')
    const late = await PrintJob.query().where({ status: PrintJob.CONFIRMED }).whereRaw('due_on - make_interval(days => ?) < current_date', [days]).limit(BATCH).get()

    for (const job of late.all()) await PrintDeadlines.miss(job, 'print')

    return late.all().length
  }

  /** Printed jobs not posted by go-live. A job sent back by the advertiser's dispute isn't late. */
  private static async missPosts(): Promise<number> {
    const late = await PrintJob.query()
      .where({ status: PrintJob.PRINTED })
      .whereRaw('due_on < current_date')
      .whereRaw("booking_id in (select id from bookings where proof_status = 'none')")
      .limit(BATCH)
      .get()

    for (const job of late.all()) await PrintDeadlines.miss(job, 'post')

    return late.all().length
  }

  /** Take the job back, record the miss, and suspend a dispatcher who misses too often. */
  private static async miss(job: PrintJob, stage: PrintJobMissStage): Promise<void> {
    const dispatcherId = job.dispatcherId

    if (!dispatcherId) return

    const rushDays = await Settings.number('printing.rush_days')
    const rush = Day.of(job.dueOn) <= Day.today(rushDays)
    const bonusMinor = rush ? Math.round((Number(job.feeMinor) * (await Settings.number('printing.rush_bonus_percent'))) / 100) : Number(job.bonusMinor ?? 0)

    const taken = await PrintJob.query()
      .where({ id: job.id, status: job.status, dispatcherId })
      .updateFrom({ status: PrintJob.OPEN, dispatcherId: null, reservedUntil: null, confirmedAt: null, printPhotoPath: null, printPhotoDisk: null, printedAt: null, bonusMinor })

    if (!taken) return

    await StoredImage.remove(job.printPhotoDisk, job.printPhotoPath)
    const miss = await PrintJobMiss.query().create({ printJobId: job.id, dispatcherId, stage })

    await Reputation.award(dispatcherId, 'dispatch', 'missed', miss.id)

    const user = await User.query().find(dispatcherId)
    const board = await Board.query().find(job.boardId)

    if (user) await AccountMail.printJobMissed(user, board?.name ?? 'a board', REASONS[stage])?.catch(() => undefined)

    await PrintDeadlines.suspendIfRepeated(dispatcherId)
  }

  private static async suspendIfRepeated(dispatcherId: string): Promise<void> {
    const max = await Settings.number('printing.max_misses')
    const windowDays = await Settings.number('printing.miss_window_days')
    const misses = await PrintJobMiss.query().where({ dispatcherId }).whereRaw('"createdAt" > now() - make_interval(days => ?)', [windowDays]).count()

    if (misses < max) return

    const role = await AccountRole.query().where({ userId: dispatcherId, kind: 'dispatch' }).first()

    await role?.suspend(`Missed ${misses} print jobs in ${windowDays} days.`)
  }

  /** Warn the scout who runs the board, or the owner, once, when nobody has taken its job close to go-live. */
  private static async alertUnclaimed(): Promise<number> {
    const rushDays = await Settings.number('printing.rush_days')
    const jobs = await PrintJob.scope('available').whereNull('unclaimedAlertAt').whereRaw('due_on <= current_date + make_interval(days => ?)', [rushDays]).limit(BATCH).get()

    for (const job of jobs.all()) {
      await PrintDeadlines.alert(job)
      await job.update({ unclaimedAlertAt: new Date() })
    }

    return jobs.all().length
  }

  private static async alert(job: PrintJob): Promise<void> {
    const booking = await Booking.query().find(job.bookingId)
    const board = await Board.query().find(job.boardId)

    if (!booking || !board) return

    const dueOn = Day.of(job.dueOn)
    const link = `${config('app.frontend_url')}/bookings/${booking.id}`
    const profile = booking.ownerProfileId ? await OwnerProfile.query().find(booking.ownerProfileId) : null
    const contactId = booking.scoutId ?? profile?.userId ?? null
    const contact = contactId ? await User.query().find(contactId) : null

    if (contact) {
      await AccountMail.printJobUnclaimed(contact, board.name, dueOn, link)?.catch(() => undefined)

      return
    }

    if (profile?.phone) await Sms.send(profile.phone, `Nobody has taken the print job for "${board.name}" yet, and it goes live on ${dueOn}. Can you put it up yourself? Let us know. - Greyboards`).catch(() => undefined)
  }
}
