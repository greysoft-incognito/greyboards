import { Model } from '@arkstack/database'
import { abortIf } from '@arkstack/common'
import { BoardPolicy } from '@app/policies/BoardPolicy'
import { Commissions } from '@app/services/Commissions'
import { Day } from '@app/support/Day'
import { Settings } from '@app/support/Settings'
import { Bid } from './Bid'
import { Board, type BoardRatePeriod } from './Board'
import { BoardFace } from './BoardFace'
import { Booking } from './Booking'
import { BookingShare } from './BookingShare'
import { User } from './User'

/**
 * `open` while bids come in, `awarded` while the winner pays, `sold` once they paid,
 * `unsold` when nobody met the reserve or paid, `cancelled` when closed before any bid.
 */
export type AuctionStatus = 'open' | 'awarded' | 'sold' | 'unsold' | 'cancelled'

/** `open` shows the highest bid as it climbs; `sealed` hides bids until the close. */
export type AuctionFormat = 'open' | 'sealed'

export interface AuctionInput {
  startsOn: string
  periods: number
  reserveMinor: number
  closesAt: Date
}

/**
 * A face's dates opened to bids by whoever looks after the board. While it's open or the
 * winner pays, the dates can't be booked another way. The highest bid at or over the
 * reserve wins and is held as a booking at that price; if the winner doesn't pay in time,
 * the next highest bid gets the dates.
 *
 * A take-over auction is for a whole shared board whose lock ended with shares unpaid. The
 * shared booking already holds the dates, so the winner pays to take that booking over, by
 * `payBy`. The sharers can still fill their shares until then, which ends the auction.
 */
export class Auction extends Model {
  declare id: string
  declare boardId: string
  declare faceId: string
  declare startsOn: Date | string
  declare endsOn: Date | string
  declare periods: number
  declare ratePeriod: BoardRatePeriod
  declare currency: string
  declare reserveMinor: number
  declare format: AuctionFormat
  declare closesAt: Date
  declare status: AuctionStatus
  declare winningBidId: string | null
  declare bookingId: string | null
  declare openedById: string | null
  /** The shared booking a take-over auction is for. */
  declare sharedBookingId: string | null
  /** When a take-over winner's time to pay runs out. */
  declare payBy: Date | null
  declare createdAt: Date
  declare updatedAt: Date

  /** Statuses that keep the dates off the market. */
  static readonly TAKING: AuctionStatus[] = ['open', 'awarded']

  /** Auctions one board can have running at once. */
  static readonly MAX_OPEN_PER_BOARD = 20

  /** The least time bidding can stay open, in hours. */
  static readonly MIN_OPEN_HOURS = 1

  protected static override table = 'auctions'

  protected static override columns = {
    boardId: 'board_id',
    faceId: 'face_id',
    startsOn: 'starts_on',
    endsOn: 'ends_on',
    ratePeriod: 'rate_period',
    reserveMinor: 'reserve_minor',
    closesAt: 'closes_at',
    winningBidId: 'winning_bid_id',
    bookingId: 'booking_id',
    openedById: 'opened_by_id',
    sharedBookingId: 'shared_booking_id',
    payBy: 'pay_by',
  }

  protected override casts = {
    reserveMinor: 'number',
  } as never

  /**
   * Open a face's dates to bids. The dates must be free, the reserve at least the lowest
   * the settings allow, and bidding must close early enough for the winner to pay and the
   * artwork to go up.
   */
  static async open(board: Board, face: BoardFace, user: User, input: AuctionInput): Promise<Auction> {
    const blocker = await Commissions.blocker(board)
    const leadDays = await Settings.number('bookings.lead_days')
    const maxPeriods = await Settings.number('bookings.max_periods')
    const maxOpenDays = await Settings.number('bids.max_open_days')
    const payHours = await Settings.number('bids.pay_hours')
    const listMinor = (board.rateFor(face) ?? 0) * input.periods
    const lowest = Math.ceil((listMinor * (await Settings.number('bids.min_reserve_percent'))) / 100)
    const closes = input.closesAt.getTime()

    abortIf(!!blocker, blocker ?? '', 422)
    abortIf(!Day.valid(input.startsOn), 'Pick the first day.', 422)
    abortIf(input.startsOn > Day.today(Booking.MAX_DAYS_AHEAD), 'Dates can start up to a year ahead.', 422)
    abortIf(input.periods < 1 || input.periods > maxPeriods, `Offer between 1 and ${maxPeriods} ${board.ratePeriod}s.`, 422)
    abortIf(input.reserveMinor < Math.max(lowest, 1), `Set the reserve to at least ${(lowest / 100).toLocaleString('en')} ${board.currency}.`, 422)
    abortIf(closes < Date.now() + Auction.MIN_OPEN_HOURS * 3_600_000, `Keep bidding open for at least ${Auction.MIN_OPEN_HOURS} hour.`, 422)
    abortIf(closes > Date.now() + maxOpenDays * 86_400_000, `Close bidding within ${maxOpenDays} days.`, 422)
    abortIf(
      closes + payHours * 3_600_000 > Date.parse(`${Day.addDays(input.startsOn, -leadDays)}T00:00:00Z`),
      `Close bidding at least ${payHours} hours and ${leadDays} days before the first day, so the winner can pay and the artwork can go up.`,
      422,
    )

    const endsOn = Booking.endOf(input.startsOn, input.periods, board.ratePeriod)
    const running = await Auction.query().where({ boardId: board.id }).whereIn('status', Auction.TAKING).count()

    abortIf(running >= Auction.MAX_OPEN_PER_BOARD, `A board can have up to ${Auction.MAX_OPEN_PER_BOARD} auctions running. Close one first.`, 422)
    abortIf((await Booking.taken(board, face, input.startsOn, endsOn)).length > 0, 'Some of those dates are booked, blocked or already open for bids.', 409)

    return Auction.query().create({
      boardId: board.id,
      faceId: face.id,
      startsOn: input.startsOn,
      endsOn,
      periods: input.periods,
      ratePeriod: board.ratePeriod,
      currency: board.currency,
      reserveMinor: input.reserveMinor,
      format: (await Settings.get<string>('bids.format')) === 'sealed' ? 'sealed' : 'open',
      closesAt: input.closesAt,
      status: 'open',
      openedById: user.id,
    })
  }

  /**
   * Put a shared board up for bids, whole, until `closesAt`. The reserve is the full price,
   * and only one take-over auction runs per shared booking at a time.
   */
  static async openTakeover(booking: Booking, closesAt: Date): Promise<Auction> {
    const running = await Auction.takeoverFor(booking)

    if (running) return running

    const faceId = booking.faceId ?? (await (await booking.board().firstOrFail()).faceFor(null)).id

    try {
      return await Auction.query().create({
        boardId: booking.boardId,
        faceId,
        startsOn: booking.days().startsOn,
        endsOn: booking.days().endsOn,
        periods: booking.periods,
        ratePeriod: booking.ratePeriod,
        currency: booking.currency,
        reserveMinor: booking.amountMinor,
        format: (await Settings.get<string>('bids.format')) === 'sealed' ? 'sealed' : 'open',
        closesAt,
        status: 'open',
        openedById: null,
        sharedBookingId: booking.id,
      })
    } catch (error) {
      const raced = await Auction.takeoverFor(booking)

      if (raced) return raced

      throw error
    }
  }

  /** The take-over auction running for a shared booking, open or waiting for the winner to pay. */
  static takeoverFor(booking: Booking): Promise<Auction | null> {
    return Auction.query().where({ sharedBookingId: booking.id }).whereIn('status', Auction.TAKING).first()
  }

  /** The sharers paid every share first, so the board stays theirs: bidding ends without a sale. */
  static async endTakeover(booking: Booking): Promise<void> {
    const auction = await Auction.takeoverFor(booking)

    if (!auction) return
    if (auction.winningBidId) await Bid.query().where({ id: auction.winningBidId }).updateFrom({ status: 'lost' })

    await auction.endUnsold()
  }

  /** Auctions on a face that keep any day from `from` to `to` off the market. Take-overs don't: their shared booking already does. */
  static covering(face: BoardFace, from: string, to: string) {
    return Auction.query()
      .where({ faceId: face.id })
      .whereIn('status', Auction.TAKING)
      .whereRaw('shared_booking_id is null and ends_on >= ? and starts_on <= ?', [from, to])
  }

  static covers(face: BoardFace, from: string, to: string): Promise<boolean> {
    return Auction.covering(face, from, to).exists()
  }

  /**
   * Close auctions whose time ran out, give unpaid wins to the next bid and mark paid ones
   * sold. Runs on the schedule, a page at a time. Returns how many auctions changed.
   */
  static async settle(): Promise<number> {
    const due = await Auction.query().where({ status: 'open' }).whereRaw('closes_at <= now()').oldest('closesAt').limit(100).get()
    const awarded = await Auction.query().where({ status: 'awarded' }).oldest('updatedAt').limit(200).get()
    let changed = 0

    for (const auction of due.all()) {
      await auction.close()
      changed++
    }

    for (const auction of awarded.all()) if (await auction.followUp()) changed++

    return changed
  }

  board() {
    return this.belongsTo(Board, 'boardId')
  }

  face() {
    return this.belongsTo(BoardFace, 'faceId')
  }

  bids() {
    return this.hasMany(Bid, 'auctionId')
  }

  days(): { startsOn: string; endsOn: string } {
    return { startsOn: Day.of(this.startsOn), endsOn: Day.of(this.endsOn) }
  }

  isTakeover(): boolean {
    return !!this.sharedBookingId
  }

  isOpen(): boolean {
    return this.status === 'open' && this.closesAt.getTime() > Date.now()
  }

  /** Whether anyone may see the bids' amounts: always on open auctions, after the close on sealed ones. */
  showsAmounts(): boolean {
    return this.format === 'open' || !this.isOpen()
  }

  /** The highest bid still in play, earliest first on a tie. */
  highest(): Promise<Bid | null> {
    return Bid.query().where({ auctionId: this.id, status: 'active' }).orderBy([{ amountMinor: 'desc' }, { updatedAt: 'asc' }]).first()
  }

  /** The least the next bid may be: the reserve, or on open auctions, a raise over the highest. */
  async nextMinimum(): Promise<number> {
    const top = this.format === 'open' ? await this.highest() : null

    if (!top) return this.reserveMinor

    const raise = Math.ceil((top.amountMinor * (await Settings.number('bids.min_raise_percent'))) / 100)

    return Math.max(this.reserveMinor, top.amountMinor + Math.max(raise, 1))
  }

  /**
   * Place or raise `user`'s bid. A bid in the last minutes pushes the close back, so the
   * others have time to answer it.
   */
  async placeBid(user: User, amountMinor: number): Promise<Bid> {
    const board = await this.board().firstOrFail()
    const mine = await Bid.query().where({ auctionId: this.id, bidderId: user.id }).first()
    const minimum = await this.nextMinimum()

    abortIf(!this.isOpen(), 'Bidding has closed.', 422)
    abortIf(await BoardPolicy.manages(user, board), 'You look after this board, so you can’t bid for it.', 422)
    abortIf(this.isTakeover() && (await this.sharing(user)), 'You’re sharing this board. Pay or cover the unpaid shares to keep it instead.', 422)
    abortIf(amountMinor < minimum, `Bid at least ${(minimum / 100).toLocaleString('en')} ${this.currency}.`, 422)
    abortIf(!!mine && amountMinor <= mine.amountMinor, 'Raise your bid above the one you placed.', 422)

    const bid = mine
      ? await mine.update({ amountMinor, status: 'active' }).then(() => mine)
      : await Bid.query().create({ auctionId: this.id, bidderId: user.id, amountMinor, status: 'active' })
    const extendMs = (await Settings.number('bids.extend_minutes')) * 60_000

    if (this.closesAt.getTime() - Date.now() < extendMs) await this.update({ closesAt: new Date(Date.now() + extendMs) })

    return bid
  }

  /** Close bidding early. Only before anyone bid, so no bidder loses a chance they were given. */
  async cancel(): Promise<void> {
    abortIf(this.status !== 'open', 'Only an auction still taking bids can be closed.', 422)
    abortIf(this.isTakeover(), 'Bidding for a shared board ends on its own, when the sharers pay or the time runs out.', 422)
    abortIf(await Bid.query().where({ auctionId: this.id }).exists(), 'Someone already bid, so this auction runs to its close.', 422)

    await this.update({ status: 'cancelled' })
  }

  /** Bidding ran out: give the dates to the highest bid at or over the reserve. */
  async close(): Promise<void> {
    if (!(await this.awardNext())) await this.endUnsold()
  }

  /** While the winner pays: once paid it's sold; a win left unpaid goes to the next bid. Returns whether anything changed. */
  async followUp(): Promise<boolean> {
    if (this.isTakeover()) return this.followUpTakeover()

    const booking = this.bookingId ? await Booking.query().find(this.bookingId) : null

    if (booking && ['paid', 'live', 'completed'].includes(booking.status)) {
      await this.markSold()

      return true
    }

    if (booking?.isHeld()) return false
    if (booking?.status === Booking.HELD) await booking.update({ status: Booking.EXPIRED, holdExpiresAt: null })
    if (this.winningBidId) await Bid.query().where({ id: this.winningBidId }).updateFrom({ status: 'lapsed' })

    if (!(await this.awardNext())) await this.endUnsold()

    return true
  }

  /**
   * Hold the dates for the highest active bid at or over the reserve, at its amount. A
   * bidder who can't take them (the dates went, or the board stopped taking bookings) is
   * passed over. Returns false when no bid is left.
   */
  private async awardNext(): Promise<boolean> {
    if (this.isTakeover()) return this.awardTakeover()

    const board = await this.board().firstOrFail()
    const face = await this.face().firstOrFail()
    const { startsOn } = this.days()

    for (let bid = await this.highest(); bid && bid.amountMinor >= this.reserveMinor; bid = await this.highest()) {
      const bidder = await User.query().find(bid.bidderId)
      const booking = bidder ? await Booking.award(board, face, bidder, startsOn, this.periods, bid.amountMinor, 'bid').catch(() => null) : null

      if (booking) {
        await bid.update({ status: 'won' })
        await this.update({ status: 'awarded', winningBidId: bid.id, bookingId: booking.id })

        return true
      }

      await bid.update({ status: 'lapsed' })
    }

    return false
  }

  /**
   * Give a shared board to the highest bid, while its shares are still unpaid. The winner has
   * `shares.takeover_pay_hours` to pay, and never past the shared booking's own hold.
   */
  private async awardTakeover(): Promise<boolean> {
    const booking = await this.sharedStillOpen()
    const bid = booking ? await this.highest() : null

    if (!booking || !bid || bid.amountMinor < this.reserveMinor) return false

    const payMs = (await Settings.number('shares.takeover_pay_hours')) * 3_600_000
    const holdEnds = booking.holdExpiresAt ? new Date(booking.holdExpiresAt).getTime() : Date.now()

    await bid.update({ status: 'won' })
    await this.update({ status: 'awarded', winningBidId: bid.id, bookingId: booking.id, payBy: new Date(Math.min(Date.now() + payMs, holdEnds)) })

    return true
  }

  /** While a take-over winner pays: sold once they did; past `payBy`, the next bid gets it; over once the sharers paid or the hold ran out. */
  private async followUpTakeover(): Promise<boolean> {
    const booking = await Booking.query().find(this.sharedBookingId!)
    const winner = this.winningBidId ? await Bid.query().find(this.winningBidId) : null

    if (booking && winner && !booking.shared && booking.advertiserId === winner.bidderId && [Booking.PAID, Booking.LIVE, Booking.COMPLETED].includes(booking.status)) {
      await this.markSold()

      return true
    }

    if (!(await this.sharedStillOpen())) {
      if (winner) await winner.update({ status: 'lost' })
      await this.endUnsold()

      return true
    }

    if (this.payBy && this.payBy.getTime() > Date.now()) return false
    if (winner) await winner.update({ status: 'lapsed' })
    if (!(await this.awardNext())) await this.endUnsold()

    return true
  }

  /** The winner paid: sold, and every other bid lost. */
  async markSold(): Promise<void> {
    await this.update({ status: 'sold' })
    await Bid.query().where({ auctionId: this.id, status: 'active' }).updateFrom({ status: 'lost' })
  }

  /** The shared booking, while it's still held with a share unpaid. */
  private async sharedStillOpen(): Promise<Booking | null> {
    const booking = this.sharedBookingId ? await Booking.query().find(this.sharedBookingId) : null

    if (!booking || !booking.shared || !booking.isHeld()) return null

    const unpaid = await BookingShare.query().where({ bookingId: booking.id }).whereRaw("status <> 'paid'").exists()

    return unpaid ? booking : null
  }

  /** Whether `user` organised or holds a share of the shared booking. */
  private async sharing(user: User): Promise<boolean> {
    const booking = await Booking.query().find(this.sharedBookingId!)

    return booking?.advertiserId === user.id || (await BookingShare.query().where({ bookingId: this.sharedBookingId!, userId: user.id }).exists())
  }

  private async endUnsold(): Promise<void> {
    await this.update({ status: 'unsold', winningBidId: null, bookingId: null })
    await Bid.query().where({ auctionId: this.id, status: 'active' }).updateFrom({ status: 'lost' })
  }
}
