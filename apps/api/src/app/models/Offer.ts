import { Model } from '@arkstack/database'
import { abortIf } from '@arkstack/common'
import type { QueryBuilder } from 'arkormx'
import { BoardPolicy } from '@app/policies/BoardPolicy'
import { Day } from '@app/support/Day'
import { Money } from '@app/support/Money'
import { Settings } from '@app/support/Settings'
import { Board, type BoardRatePeriod } from './Board'
import { BoardFace } from './BoardFace'
import { Booking } from './Booking'
import { User } from './User'

/**
 * `pending` while the board's side decides, `countered` while the advertiser decides on a
 * counter, `accepted` once it became a booking, or `declined`, `withdrawn` or `expired`.
 */
export type OfferStatus = 'pending' | 'countered' | 'accepted' | 'declined' | 'withdrawn' | 'expired'

export interface OfferInput {
  startsOn: string
  periods: number
  amountMinor: number
  note?: string | null
}

/**
 * An advertiser's offer below a fixed-price board's listed price for some dates. Whoever
 * looks after the board accepts, declines or counters it; an accepted offer or counter is
 * held as a booking at that price while the advertiser pays. Offers don't hold the dates.
 */
export class Offer extends Model {
  declare id: string
  declare boardId: string
  declare faceId: string
  declare advertiserId: string
  declare startsOn: Date | string
  declare endsOn: Date | string
  declare periods: number
  declare ratePeriod: BoardRatePeriod
  declare currency: string
  /** The listed price for the dates when the offer was made, without printing. */
  declare listMinor: number
  declare amountMinor: number
  declare counterMinor: number | null
  declare note: string | null
  declare status: OfferStatus
  declare expiresAt: Date
  declare bookingId: string | null
  declare respondedById: string | null
  declare respondedAt: Date | null
  declare createdAt: Date
  declare updatedAt: Date

  /** Offers waiting for an answer. */
  static readonly WAITING: OfferStatus[] = ['pending', 'countered']

  /** Offers one advertiser can have waiting at once. */
  static readonly MAX_WAITING = 5

  protected static override table = 'offers'

  protected static override columns = {
    boardId: 'board_id',
    faceId: 'face_id',
    advertiserId: 'advertiser_id',
    startsOn: 'starts_on',
    endsOn: 'ends_on',
    ratePeriod: 'rate_period',
    listMinor: 'list_minor',
    amountMinor: 'amount_minor',
    counterMinor: 'counter_minor',
    expiresAt: 'expires_at',
    bookingId: 'booking_id',
    respondedById: 'responded_by_id',
    respondedAt: 'responded_at',
  }

  protected override casts = {
    listMinor: 'number',
    amountMinor: 'number',
    counterMinor: 'number',
  } as never

  /** Offer `amountMinor` for a face's dates, below the listed price and at least the lowest the settings allow. */
  static async make(board: Board, face: BoardFace, advertiser: User, input: OfferInput): Promise<Offer> {
    const endsOn = await Booking.checkDates(board, face, advertiser, input.startsOn, input.periods)
    const listMinor = board.rateFor(face)! * input.periods
    const lowest = Math.ceil((listMinor * (await Settings.number('bids.min_offer_percent'))) / 100)

    await Offer.expireDue()

    const waiting = await Offer.query().where({ advertiserId: advertiser.id }).whereIn('status', Offer.WAITING).count()

    abortIf(input.amountMinor >= listMinor, 'That’s the full price or more. Just book it instead.', 422)
    abortIf(input.amountMinor < lowest, `Offer at least ${Money.format(lowest, board.currency)}.`, 422)
    abortIf(waiting >= Offer.MAX_WAITING, `You have ${Offer.MAX_WAITING} offers waiting for a reply. Wait for one, or withdraw it.`, 429)
    abortIf((await Booking.taken(board, face, input.startsOn, endsOn)).length > 0, 'Some of those dates were just booked. Try other dates.', 409)

    return Offer.query().create({
      boardId: board.id,
      faceId: face.id,
      advertiserId: advertiser.id,
      startsOn: input.startsOn,
      endsOn,
      periods: input.periods,
      ratePeriod: board.ratePeriod,
      currency: board.currency,
      listMinor,
      amountMinor: input.amountMinor,
      note: input.note?.trim() || null,
      status: 'pending',
      expiresAt: await Offer.replyBy(),
    })
  }

  /** Lapse offers and counters nobody answered in time. */
  static async expireDue(): Promise<void> {
    await Offer.query().whereIn('status', Offer.WAITING).whereRaw('expires_at < now()').updateFrom({ status: 'expired' })
  }

  private static async replyBy(): Promise<Date> {
    return new Date(Date.now() + (await Settings.number('bids.offer_reply_hours')) * 3_600_000)
  }

  board() {
    return this.belongsTo(Board, 'boardId')
  }

  face() {
    return this.belongsTo(BoardFace, 'faceId')
  }

  advertiser() {
    return this.belongsTo(User, 'advertiserId')
  }

  /** Offers an advertiser made. */
  scopeMadeBy(query: QueryBuilder<Offer>, user: User): QueryBuilder<Offer> {
    return query.where({ advertiserId: user.id })
  }

  /** Offers on boards `user` tagged or owns. */
  scopeOnBoardsOf(query: QueryBuilder<Offer>, user: User): QueryBuilder<Offer> {
    return query.whereRaw(
      'board_id in (select id from boards where tagged_by_id = ? or owner_profile_id in (select id from owner_profiles where user_id = ?))',
      [user.id, user.id],
    )
  }

  days(): { startsOn: string; endsOn: string } {
    return { startsOn: Day.of(this.startsOn), endsOn: Day.of(this.endsOn) }
  }

  /** An offer or counter whose time ran out shows as expired even before it is lapsed. */
  displayStatus(): OfferStatus {
    return Offer.WAITING.includes(this.status) && this.expiresAt.getTime() <= Date.now() ? 'expired' : this.status
  }

  /** Whose turn it is: the board's side on a pending offer, the advertiser on a counter. */
  async awaits(user: User): Promise<boolean> {
    const status = this.displayStatus()

    if (status === 'countered') return user.id === this.advertiserId
    if (status !== 'pending') return false

    return BoardPolicy.manages(user, await this.board().firstOrFail())
  }

  /** Agree to the offer, or to the counter, which holds the dates at that price while the advertiser pays. */
  async accept(user: User): Promise<Booking> {
    abortIf(!(await this.awaits(user)), 'This offer is no longer available.', 422)

    const board = await this.board().firstOrFail()
    const face = await this.face().firstOrFail()
    const advertiser = await this.advertiser().firstOrFail()
    const booking = await Booking.award(board, face, advertiser, this.days().startsOn, this.periods, this.counterMinor ?? this.amountMinor, 'offer')

    await this.update({ status: 'accepted', bookingId: booking.id, respondedById: user.id, respondedAt: new Date() })

    return booking
  }

  async decline(user: User): Promise<void> {
    abortIf(!(await this.awaits(user)), 'This offer is no longer available.', 422)

    await this.update({ status: 'declined', respondedById: user.id, respondedAt: new Date() })
  }

  /** The board's side names the price they would take, between the offer and the listed price. */
  async counter(user: User, amountMinor: number): Promise<void> {
    abortIf(this.displayStatus() !== 'pending' || !(await this.awaits(user)), 'This offer is no longer available.', 422)
    abortIf(amountMinor <= this.amountMinor, 'Suggest a price higher than their offer, or accept it.', 422)
    abortIf(amountMinor >= this.listMinor, 'Suggest a price below your listed price, or decline.', 422)

    await this.update({ status: 'countered', counterMinor: amountMinor, respondedById: user.id, respondedAt: new Date(), expiresAt: await Offer.replyBy() })
  }

  async withdraw(user: User): Promise<void> {
    abortIf(user.id !== this.advertiserId, 'Only the person who made this offer can withdraw it.', 403)
    abortIf(!Offer.WAITING.includes(this.displayStatus()), 'This offer has already been answered.', 422)

    await this.update({ status: 'withdrawn' })
  }
}
