import { Model } from '@arkstack/database'
import { abortIf } from '@arkstack/common'
import type { QueryBuilder } from 'arkormx'
import { BoardPolicy } from '@app/policies/BoardPolicy'
import { Commissions } from '@app/services/Commissions'
import { Day } from '@app/support/Day'
import { Money } from '@app/support/Money'
import { Settings } from '@app/support/Settings'
import { Sms } from '@app/support/Sms'
import { Board, type BoardRatePeriod } from './Board'
import { LedgerEntry } from './LedgerEntry'
import { OwnerProfile } from './OwnerProfile'
import { Payment } from './Payment'
import { User } from './User'

/**
 * `held` while the advertiser pays, `paid` once the money is in escrow, `live` once the
 * artwork is up and proven, `completed` when the run ends. A hold that runs out is `expired`.
 */
export type BookingStatus = 'held' | 'paid' | 'live' | 'completed' | 'cancelled' | 'expired'

/** A run of days a booking takes on a board. */
export interface BookedDays {
  startsOn: string
  endsOn: string
}

/**
 * An advertiser's booking of a board for some weeks or months. The price is copied in when
 * the dates are held, and the money's split when it is paid, so later changes to the board
 * or the settings don't change either. The database refuses two live bookings on one day.
 */
export class Booking extends Model {
  declare id: string
  declare boardId: string
  declare advertiserId: string
  declare startsOn: Date | string
  declare endsOn: Date | string
  declare periods: number
  declare ratePeriod: BoardRatePeriod
  declare rateMinor: number
  declare amountMinor: number
  declare currency: string
  declare status: BookingStatus
  declare holdExpiresAt: Date | null
  declare ownerSharePercent: number | null
  declare ownerAmountMinor: number | null
  declare scoutAmountMinor: number | null
  declare platformAmountMinor: number | null
  declare scoutId: string | null
  declare ownerProfileId: string | null
  declare paidAt: Date | null
  declare cancelledAt: Date | null
  declare createdAt: Date
  declare updatedAt: Date

  static readonly HELD: BookingStatus = 'held'
  static readonly PAID: BookingStatus = 'paid'
  static readonly LIVE: BookingStatus = 'live'
  static readonly COMPLETED: BookingStatus = 'completed'
  static readonly CANCELLED: BookingStatus = 'cancelled'
  static readonly EXPIRED: BookingStatus = 'expired'

  /** Statuses that keep the days taken. */
  static readonly TAKING: BookingStatus[] = ['held', 'paid', 'live']

  /** Checkouts one advertiser can have open at once. */
  static readonly MAX_HOLDS = 3

  /** The furthest ahead a booking can start, in days. */
  static readonly MAX_DAYS_AHEAD = 365

  protected static override table = 'bookings'

  protected static override columns = {
    boardId: 'board_id',
    advertiserId: 'advertiser_id',
    startsOn: 'starts_on',
    endsOn: 'ends_on',
    ratePeriod: 'rate_period',
    rateMinor: 'rate_minor',
    amountMinor: 'amount_minor',
    holdExpiresAt: 'hold_expires_at',
    ownerSharePercent: 'owner_share_percent',
    ownerAmountMinor: 'owner_amount_minor',
    scoutAmountMinor: 'scout_amount_minor',
    platformAmountMinor: 'platform_amount_minor',
    scoutId: 'scout_id',
    ownerProfileId: 'owner_profile_id',
    paidAt: 'paid_at',
    cancelledAt: 'cancelled_at',
  }

  protected override casts = {
    rateMinor: 'number',
    amountMinor: 'number',
    ownerAmountMinor: 'number',
    scoutAmountMinor: 'number',
    platformAmountMinor: 'number',
  } as never

  /**
   * The last day of a run of `periods` weeks or months from `startsOn`. A month run that
   * lands past a shorter month's end stops on its last day (31 March for a month ends 30 April).
   */
  static endOf(startsOn: string, periods: number, period: BoardRatePeriod): string {
    if (period === 'week') return Day.addDays(startsOn, periods * 7 - 1)

    const next = Day.addMonths(startsOn, periods)
    const shortened = Number(next.slice(8)) < Number(startsOn.slice(8))

    return shortened ? next : Day.addDays(next, -1)
  }

  /**
   * Hold `board` for `advertiser` from `startsOn` for `periods` of its rate, while they pay.
   * Holds that ran out are let go first; dates someone else holds or booked are refused.
   */
  static async hold(board: Board, advertiser: User, startsOn: string, periods: number): Promise<Booking> {
    const blocker = await Commissions.blocker(board)
    const earliest = Day.today(await Settings.number('bookings.lead_days'))
    const maxPeriods = await Settings.number('bookings.max_periods')

    abortIf(!!blocker, blocker ?? '', 422)
    abortIf(await BoardPolicy.manages(advertiser, board), 'You look after this board, so you can’t book it.', 422)
    abortIf(!Day.valid(startsOn), 'Pick a start date.', 422)
    abortIf(startsOn < earliest, `The earliest start is ${earliest}, to leave time to print and put the artwork up.`, 422)
    abortIf(startsOn > Day.today(Booking.MAX_DAYS_AHEAD), 'Bookings can start up to a year ahead.', 422)
    abortIf(periods < 1 || periods > maxPeriods, `Book between 1 and ${maxPeriods} ${board.ratePeriod}s.`, 422)

    await Booking.expireHolds()

    const open = await Booking.query().where({ advertiserId: advertiser.id, status: Booking.HELD }).count()

    abortIf(open >= Booking.MAX_HOLDS, 'Finish or cancel a checkout you started before booking another board.', 429)

    const rateMinor = board.rate()!
    const holdMinutes = await Settings.number('bookings.hold_minutes')

    try {
      return await Booking.query().create({
        boardId: board.id,
        advertiserId: advertiser.id,
        startsOn,
        endsOn: Booking.endOf(startsOn, periods, board.ratePeriod),
        periods,
        ratePeriod: board.ratePeriod,
        rateMinor,
        amountMinor: rateMinor * periods,
        currency: board.currency,
        status: Booking.HELD,
        holdExpiresAt: new Date(Date.now() + holdMinutes * 60_000),
        ownerProfileId: board.ownerProfileId,
      })
    } catch (error) {
      abortIf(Booking.isOverlap(error), 'Someone else has some of those dates. Pick other dates.', 409)

      throw error
    }
  }

  /** Let go of every hold that ran out, so its days can be booked again. */
  static async expireHolds(): Promise<void> {
    await Booking.query().where({ status: Booking.HELD }).whereRaw('hold_expires_at < now()').updateFrom({ status: Booking.EXPIRED })
  }

  /** Days already taken on `board` between two days, at most a year's worth of bookings. */
  static async taken(board: Board, from: string, to: string): Promise<BookedDays[]> {
    await Booking.expireHolds()

    const rows = await Booking.query()
      .where({ boardId: board.id })
      .whereIn('status', Booking.TAKING)
      .whereRaw('ends_on >= ? and starts_on <= ?', [from, to])
      .oldest('startsOn')
      .limit(200)
      .get()

    return rows.all().map((booking) => booking.days())
  }

  /** Whether the database turned a booking away for sharing days with another. */
  private static isOverlap(error: unknown): boolean {
    const failure = error as { code?: string; message?: string; cause?: { code?: string } }

    return failure?.code === '23P01' || failure?.cause?.code === '23P01' || String(failure?.message ?? '').includes('bookings_no_overlap')
  }

  board() {
    return this.belongsTo(Board, 'boardId')
  }

  advertiser() {
    return this.belongsTo(User, 'advertiserId')
  }

  payments() {
    return this.hasMany(Payment, 'bookingId')
  }

  ledgerEntries() {
    return this.hasMany(LedgerEntry, 'bookingId')
  }

  /** Bookings an advertiser made. */
  scopeMadeBy(query: QueryBuilder<Booking>, user: User): QueryBuilder<Booking> {
    return query.where({ advertiserId: user.id })
  }

  /** Bookings on boards `user` tagged or owns. */
  scopeOnBoardsOf(query: QueryBuilder<Booking>, user: User): QueryBuilder<Booking> {
    return query.whereRaw(
      'board_id in (select id from boards where tagged_by_id = ? or owner_profile_id in (select id from owner_profiles where user_id = ?))',
      [user.id, user.id],
    )
  }

  days(): BookedDays {
    return { startsOn: Day.of(this.startsOn), endsOn: Day.of(this.endsOn) }
  }

  /** Held, with time left to pay. */
  isHeld(): boolean {
    return this.status === Booking.HELD && !!this.holdExpiresAt && this.holdExpiresAt.getTime() > Date.now()
  }

  /** A hold whose time ran out shows as expired even before it is let go. */
  displayStatus(): BookingStatus {
    return this.status === Booking.HELD && !this.isHeld() ? Booking.EXPIRED : this.status
  }

  secondsLeft(): number | null {
    return this.isHeld() ? Math.ceil((this.holdExpiresAt!.getTime() - Date.now()) / 1000) : null
  }

  /** The advertiser lets go of a hold. Paid bookings go through support, so refunds stay in the ledger. */
  async cancel(): Promise<void> {
    abortIf(this.status !== Booking.HELD, 'Only a booking that isn’t paid yet can be cancelled here. Contact support about a paid one.', 422)

    await this.update({ status: Booking.CANCELLED, cancelledAt: new Date(), holdExpiresAt: null })
  }

  /**
   * Record the advertiser's payment: the money goes into escrow and the split is fixed.
   * A payment that lands after its hold ran out still counts if the days are free; if
   * someone else took them meanwhile, the booking is cancelled and the money is owed back.
   */
  async markPaid(payment: Payment): Promise<void> {
    const board = await this.board().firstOrFail()
    const split = await Commissions.split(board, this.amountMinor)
    const paidAt = new Date()

    try {
      await this.update({ status: Booking.PAID, holdExpiresAt: null, paidAt, ...split })
    } catch (error) {
      if (!Booking.isOverlap(error)) throw error

      await this.update({ status: Booking.CANCELLED, cancelledAt: paidAt, holdExpiresAt: null })
      await this.record('refund', 'payment_refund_due', this.amountMinor, payment.reference, 'Paid after the hold ran out and the days were taken')

      return
    }

    await this.record('escrow', 'payment_in', this.amountMinor, payment.reference, 'Held until the artwork is up')
    await this.tellOwner(board)
  }

  /** Add a line to this booking's ledger. */
  private async record(account: LedgerEntry['account'], kind: string, amountMinor: number, reference: string | null, memo: string): Promise<void> {
    await LedgerEntry.query().create({ bookingId: this.id, account, kind, amountMinor, currency: this.currency, reference, memo, userId: this.advertiserId })
  }

  /** Text the owner that their board is booked and what they'll receive, signed in or not. */
  private async tellOwner(board: Board): Promise<void> {
    const profile = this.ownerProfileId ? await OwnerProfile.query().find(this.ownerProfileId) : null

    if (!profile?.phone || this.ownerAmountMinor === null) return

    const { startsOn, endsOn } = this.days()

    await Sms.send(
      profile.phone,
      `Your board "${board.name}" is booked from ${startsOn} to ${endsOn} for ${Money.format(this.amountMinor, this.currency)}. You'll receive ${Money.format(this.ownerAmountMinor, this.currency)} after the ad is up. - Greyboards`,
    ).catch(() => undefined)
  }
}
