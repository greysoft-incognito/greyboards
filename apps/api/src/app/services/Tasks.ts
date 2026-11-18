import { Board } from '@app/models/Board'
import { BoardAgreement } from '@app/models/BoardAgreement'
import { Booking } from '@app/models/Booking'
import { PrintJob } from '@app/models/PrintJob'
import { Prospect } from '@app/models/Prospect'
import type { User } from '@app/models/User'
import { BookingPolicy } from '@app/policies/BookingPolicy'
import { Day } from '@app/support/Day'
import { Settings } from '@app/support/Settings'

export type TaskKind = 'artwork' | 'install' | 'proof' | 'agreement' | 'follow_up'

export interface Task {
  kind: TaskKind
  title: string
  detail: string
  /** 'YYYY-MM-DD' when it's due, if it is. */
  dueOn: string | null
  bookingId: string | null
  boardId: string | null
  prospectId: string | null
}

/** Items of each kind looked at per list. */
const EACH = 20

/**
 * What needs doing on the boards someone looks after, and in a scout's pipeline: artwork
 * to check, installs nobody has taken, proof photos due, agreements owners haven't signed,
 * and prospects gone quiet. Worked out when asked, so it's never out of date.
 */
export class Tasks {
  static async for(user: User): Promise<Task[]> {
    const days = await Settings.number('scouting.task_days')
    const horizon = Day.today(days)
    const bookings = (await Booking.scope('onBoardsOf', user).where({ status: Booking.PAID }).whereRaw('starts_on <= ?', [horizon]).oldest('startsOn').limit(EACH * 2).get()).all()
    const artwork = (await Booking.scope('onBoardsOf', user).where({ status: Booking.PAID, artworkStatus: 'submitted' }).oldest('startsOn').limit(EACH).get()).all()
    const boards = await Tasks.boards([...bookings, ...artwork].map((booking) => booking.boardId))
    const tasks: Task[] = []

    const name = (booking: Booking) => boards.get(booking.boardId)?.name ?? 'your board'
    const task = (kind: TaskKind, title: string, detail: string, booking: Booking): Task => ({ kind, title, detail, dueOn: booking.days().startsOn, bookingId: booking.id, boardId: booking.boardId, prospectId: null })

    for (const booking of artwork) tasks.push(task('artwork', `Check the artwork for ${name(booking)}`, 'Approve it so it can go to print, or send it back with a note.', booking))

    for (const booking of bookings) {
      if (booking.artworkStatus !== 'approved' || !['none', 'disputed'].includes(booking.proofStatus)) continue

      const job = await PrintJob.query().where({ bookingId: booking.id }).first()

      if (job?.isAvailable()) tasks.push(task('install', `Arrange printing and posting on ${name(booking)}`, 'No dispatcher has taken the job yet. Step in, or wait for one.', booking))
      else if (await BookingPolicy.postsProof(user, booking))
        tasks.push(task('proof', `Photos of the ad on ${name(booking)}`, booking.proofStatus === 'disputed' ? 'The advertiser asked for better photos.' : 'Take them at the board once the ad is up.', booking))
    }

    return [...tasks, ...(await Tasks.agreements(user)), ...(await Tasks.quiet(user, days))].sort((a, b) => (a.dueOn ?? '9999').localeCompare(b.dueOn ?? '9999'))
  }

  /** Agreements the user sent that owners haven't signed. */
  private static async agreements(user: User): Promise<Task[]> {
    const sent = (await BoardAgreement.query().where({ sentById: user.id, status: BoardAgreement.SENT }).oldest('lastSentAt').limit(EACH).get()).all()
    const boards = await Tasks.boards(sent.map((agreement) => agreement.boardId))

    return sent.map((agreement) => ({
      kind: 'agreement',
      title: `${agreement.ownerName ?? 'The owner'} hasn’t signed for ${boards.get(agreement.boardId)?.name ?? 'the board'}`,
      detail: 'Remind them, or send the agreement again.',
      dueOn: Day.of(agreement.expiresAt),
      bookingId: null,
      boardId: agreement.boardId,
      prospectId: null,
    }))
  }

  /** The scout's prospects nobody has moved on for `days`. */
  private static async quiet(user: User, days: number): Promise<Task[]> {
    const prospects = (
      await Prospect.query()
        .where({ scoutId: user.id })
        .whereNull('boardId')
        .whereIn('stage', ['prospect', 'contacted', 'signed'])
        .whereRaw('"updatedAt" < now() - make_interval(days => ?)', [days])
        .oldest('updatedAt')
        .limit(EACH)
        .get()
    ).all()

    return prospects.map((prospect) => ({
      kind: 'follow_up',
      title: `Follow up on ${prospect.name}`,
      detail: prospect.stage === 'signed' ? 'The owner signed. Tag the board to capture it.' : prospect.ownerName ? `Get back to ${prospect.ownerName}.` : 'Find the owner and make contact.',
      dueOn: null,
      bookingId: null,
      boardId: null,
      prospectId: prospect.id,
    }))
  }

  private static async boards(ids: string[]): Promise<Map<string, Board>> {
    const unique = [...new Set(ids)]
    const boards = unique.length ? (await Board.query().whereIn('id', unique).get()).all() : []

    return new Map(boards.map((board) => [board.id, board]))
  }
}
