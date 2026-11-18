import { Model } from '@arkstack/database'
import { abortIf } from '@arkstack/common'
import type { QueryBuilder } from 'arkormx'
import { BoardPolicy } from '@app/policies/BoardPolicy'
import { Commissions } from '@app/services/Commissions'
import { OwnerPricing } from '@app/services/OwnerPricing'
import { DigitalSlots, type Daypart, type SlotPick } from '@app/services/DigitalSlots'
import { Refunds } from '@app/services/Refunds'
import { Shares } from '@app/services/Shares'
import { Payouts } from '@app/services/Payouts'
import { Reputation } from '@app/services/Reputation'
import { Day } from '@app/support/Day'
import { Money } from '@app/support/Money'
import { Auction } from './Auction'
import { AvailabilityBlock } from './AvailabilityBlock'
import { BoardFace } from './BoardFace'
import { Settings } from '@app/support/Settings'
import { Sms } from '@app/support/Sms'
import { StoredImage, type SavedImage } from '@app/support/StoredImage'
import { Board, type BoardRatePeriod } from './Board'
import { Dispute } from './Dispute'
import { LedgerEntry } from './LedgerEntry'
import { OwnerProfile } from './OwnerProfile'
import { Payment } from './Payment'
import { PostingProof, type ProofLocation } from './PostingProof'
import { PrintJob } from './PrintJob'
import { User, type UploadedFile } from './User'

/**
 * `held` while the advertiser pays, `paid` once the money is in escrow, `live` once the
 * artwork is up and proven, `completed` when the run ends. A hold that runs out is `expired`.
 */
export type BookingStatus = 'held' | 'paid' | 'live' | 'completed' | 'cancelled' | 'expired'

/** The advertiser's artwork: none yet, waiting for the owner's check, approved or sent back. */
export type ArtworkStatus = 'none' | 'submitted' | 'approved' | 'rejected'

/**
 * Proof the ad is up: `none` until it's sent, `submitted` while the advertiser checks it,
 * `accepted` once the money is released, `disputed` when the advertiser asked for better.
 */
export type ProofStatus = 'none' | 'submitted' | 'accepted' | 'disputed'

/** `dispatch` puts the job on the marketplace; `owner` means the owner or their scout does it. */
export type PrintedBy = 'dispatch' | 'owner'

/** How the booking came about: booked at the listed price, an accepted offer, or a won bid. */
export type BookingSource = 'book' | 'offer' | 'bid'

/** What a new hold is for and costs. */
interface HoldTerms {
  startsOn: string
  endsOn: string
  periods: number
  rateMinor: number
  /** The rent for the whole run, before printing. */
  rentMinor: number
  holdMinutes: number
  source: BookingSource
  shared?: boolean
  /** On a screen, the slots and hours it takes. Anywhere else, the one slot all day. */
  pick?: SlotPick
}

/** A run of days a booking takes on a board. */
export interface BookedDays {
  startsOn: string
  endsOn: string
  /** The owner kept these days, rather than someone booking them. */
  blocked?: boolean
  /** The days are open for bids. */
  auction?: boolean
}

/**
 * An advertiser's booking of a board for some weeks or months. The price is copied in when
 * the dates are held, and the money's split when it is paid, so later changes to the board
 * or the settings don't change either. The database refuses two live bookings on one day.
 */
export class Booking extends Model {
  declare id: string
  declare boardId: string
  declare faceId: string | null
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
  declare printFeeMinor: number
  /** Who prints and puts the ad up, fixed when it's booked. */
  declare printedBy: PrintedBy
  declare source: BookingSource
  /** Split between advertisers, each paying a share. `advertiserId` is the organiser. */
  declare shared: boolean
  /** On a digital screen: the first slot of the loop it takes, how many, and the hours. Elsewhere 0, 1 and all day. */
  declare slotStart: number
  declare slots: number
  declare daypart: Daypart
  declare hourFrom: number
  declare hourTo: number
  declare artworkPath: string | null
  declare artworkDisk: string | null
  declare artworkWidth: number | null
  declare artworkHeight: number | null
  declare artworkStatus: ArtworkStatus
  declare artworkNote: string | null
  declare artworkReviewedById: string | null
  declare artworkReviewedAt: Date | null
  declare proofStatus: ProofStatus
  declare proofNote: string | null
  declare proofSubmittedAt: Date | null
  declare proofAcceptedAt: Date | null
  declare releasedAt: Date | null
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
    faceId: 'face_id',
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
    printFeeMinor: 'print_fee_minor',
    printedBy: 'printed_by',
    artworkPath: 'artwork_path',
    artworkDisk: 'artwork_disk',
    artworkWidth: 'artwork_width',
    artworkHeight: 'artwork_height',
    artworkStatus: 'artwork_status',
    artworkNote: 'artwork_note',
    artworkReviewedById: 'artwork_reviewed_by_id',
    artworkReviewedAt: 'artwork_reviewed_at',
    proofStatus: 'proof_status',
    proofNote: 'proof_note',
    proofSubmittedAt: 'proof_submitted_at',
    proofAcceptedAt: 'proof_accepted_at',
    releasedAt: 'released_at',
    paidAt: 'paid_at',
    cancelledAt: 'cancelled_at',
    slotStart: 'slot_start',
    hourFrom: 'hour_from',
    hourTo: 'hour_to',
  }

  protected override casts = {
    rateMinor: 'number',
    amountMinor: 'number',
    ownerAmountMinor: 'number',
    scoutAmountMinor: 'number',
    platformAmountMinor: 'number',
    printFeeMinor: 'number',
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
   * Hold a face of `board` for `advertiser` from `startsOn` for `periods` of its rate, while
   * they pay. Holds that ran out are let go first; dates someone else holds or booked, the
   * owner blocked, or that are open for bids are refused.
   */
  static async hold(board: Board, face: BoardFace, advertiser: User, startsOn: string, periods: number, shares = 1, slots?: { slots: number; daypart: Daypart }): Promise<Booking> {
    const endsOn = await Booking.checkDates(board, face, advertiser, startsOn, periods)
    const shared = shares > 1
    const payHours = shared ? await Booking.checkShares(startsOn, shares) : 0

    await Booking.expireHolds()

    const open = await Booking.query().where({ advertiserId: advertiser.id, status: Booking.HELD }).count()

    abortIf(open >= Booking.MAX_HOLDS, 'Finish or cancel a checkout you started before booking another board.', 429)

    const pick = board.isDigital() ? await DigitalSlots.pick(board, face, startsOn, endsOn, slots?.slots ?? 1, slots?.daypart ?? 'all_day') : undefined
    const rateMinor = pick ? await DigitalSlots.price(board, face, pick.slots, pick.daypart) : board.rateFor(face)!
    const holdMinutes = shared ? payHours * 60 : await Settings.number('bookings.hold_minutes')
    const booking = await Booking.reserve(board, face, advertiser, { startsOn, endsOn, periods, rateMinor, rentMinor: rateMinor * periods, holdMinutes, source: 'book', shared, pick })

    if (shared) await Shares.create(booking, advertiser, shares)

    return booking
  }

  /**
   * Whether a booking can be split `shares` ways: shared bookings are on, the count is
   * within the most allowed, and there's time for everyone to pay before the notice
   * period. Returns the hours everyone has to pay.
   */
  private static async checkShares(startsOn: string, shares: number): Promise<number> {
    const maxShares = await Settings.number('shares.max_shares')
    const payHours = await Settings.number('shares.pay_hours')
    const earliest = Day.today((await Settings.number('bookings.lead_days')) + Math.ceil(payHours / 24))

    abortIf(!(await Settings.get('shares.enabled')), 'Shared bookings aren’t available right now.', 422)
    abortIf(shares > maxShares, `Split a booking between up to ${maxShares} advertisers.`, 422)
    abortIf(startsOn < earliest, `A shared booking can start from ${earliest}, so everyone has time to pay before the artwork goes up.`, 422)

    return payHours
  }

  /**
   * Hold dates an advertiser won with a bid or agreed in an offer, at that price, for the
   * time winners have to pay. The dates must still be free and not started.
   */
  static async award(board: Board, face: BoardFace, advertiser: User, startsOn: string, periods: number, rentMinor: number, source: BookingSource): Promise<Booking> {
    const blocker = await Commissions.blocker(board)
    const endsOn = Booking.endOf(startsOn, periods, board.ratePeriod)

    abortIf(!!blocker, blocker ?? '', 422)
    abortIf(startsOn <= Day.today(), 'Those dates have already started.', 422)
    abortIf(await Booking.blocked(board, face, startsOn, endsOn), 'The owner keeps some of those dates for their own clients.', 409)

    await Booking.expireHolds()

    return Booking.reserve(board, face, advertiser, {
      startsOn,
      endsOn,
      periods,
      rateMinor: Math.round(rentMinor / periods),
      rentMinor,
      holdMinutes: (await Settings.number('bids.pay_hours')) * 60,
      source,
      pick: board.isDigital() ? { ...DigitalSlots.WHOLE, slots: (await DigitalSlots.loop(board)).slots } : undefined,
    })
  }

  /**
   * Check `advertiser` may ask for these dates on a face: the board takes bookings, they
   * don't look after it, the dates fit the notice, the length and the face's shortest run,
   * and nothing blocked or open for bids covers them. Returns the last day.
   */
  static async checkDates(board: Board, face: BoardFace, advertiser: User, startsOn: string, periods: number): Promise<string> {
    const blocker = await Commissions.blocker(board)
    const earliest = Day.today(await Settings.number('bookings.lead_days'))
    const maxPeriods = await Settings.number('bookings.max_periods')
    const minPeriods = Math.min(face.minPeriods, maxPeriods)

    abortIf(!!blocker, blocker ?? '', 422)
    abortIf(await BoardPolicy.manages(advertiser, board), 'You look after this board, so you can’t book it.', 422)
    abortIf(!Day.valid(startsOn), 'Pick a start date.', 422)
    abortIf(startsOn < earliest, `The earliest start is ${earliest}, to leave time to print and put the artwork up.`, 422)
    abortIf(startsOn > Day.today(Booking.MAX_DAYS_AHEAD), 'Bookings can start up to a year ahead.', 422)
    abortIf(periods < minPeriods || periods > maxPeriods, `Book between ${minPeriods} and ${maxPeriods} ${board.ratePeriod}s.`, 422)

    const endsOn = Booking.endOf(startsOn, periods, board.ratePeriod)

    abortIf(await Booking.blocked(board, face, startsOn, endsOn), 'The owner keeps some of those dates for their own clients. Pick other dates.', 409)
    abortIf(await Auction.covers(face, startsOn, endsOn), 'Those dates are open for bids. Bid for them, or pick other dates.', 409)

    return endsOn
  }

  /** Create the held booking. The database turns it away if another booking has any of the days. */
  private static async reserve(board: Board, face: BoardFace, advertiser: User, terms: HoldTerms): Promise<Booking> {
    const printFeeMinor = await PrintJob.feeFor(board)

    try {
      return await Booking.query().create({
        boardId: board.id,
        faceId: face.id,
        advertiserId: advertiser.id,
        startsOn: terms.startsOn,
        endsOn: terms.endsOn,
        periods: terms.periods,
        ratePeriod: board.ratePeriod,
        rateMinor: terms.rateMinor,
        printFeeMinor,
        printedBy: printFeeMinor > 0 ? 'owner' : 'dispatch',
        amountMinor: terms.rentMinor + printFeeMinor,
        currency: board.currency,
        status: Booking.HELD,
        holdExpiresAt: new Date(Date.now() + terms.holdMinutes * 60_000),
        ownerProfileId: board.ownerProfileId,
        source: terms.source,
        shared: !!terms.shared,
        ...(terms.pick ?? DigitalSlots.WHOLE),
      })
    } catch (error) {
      abortIf(Booking.isOverlap(error), terms.pick ? 'Someone just took some of those slots. Try again, or pick other dates.' : 'Someone else has some of those dates. Pick other dates.', 409)

      throw error
    }
  }

  /** Let go of every hold that ran out, so its days can be booked again. */
  static async expireHolds(): Promise<void> {
    await Booking.query().where({ status: Booking.HELD }).whereRaw('hold_expires_at < now()').updateFrom({ status: Booking.EXPIRED })
  }

  /**
   * Days already taken on a face of `board` between two days: bookings, days the owner
   * blocked for the face or the whole board, and days open for bids. At most 200 of each.
   * For a screen's `calendar`, booked days count only when no slot is left on them.
   */
  static async taken(board: Board, face: BoardFace, from: string, to: string, calendar = false): Promise<BookedDays[]> {
    await Booking.expireHolds()

    const bookings = await Booking.query()
      .where({ faceId: face.id })
      .whereIn('status', Booking.TAKING)
      .whereRaw('ends_on >= ? and starts_on <= ?', [from, to])
      .oldest('startsOn')
      .limit(200)
      .get()
    // A screen's calendar shows only the days with no slot left; the rest can still take bookings.
    const booked = calendar && board.isDigital() ? await DigitalSlots.fullDays(board, face, from, to) : bookings.all().map((booking) => booking.days())
    const blocks = await Booking.blocks(board, face, from, to).oldest('startsOn').limit(200).get()
    const auctions = await Auction.covering(face, from, to).oldest('startsOn').limit(200).get()

    return [
      ...booked,
      ...blocks.all().map((block) => ({ ...block.days(), blocked: true })),
      ...auctions.all().map((auction) => ({ ...auction.days(), auction: true })),
    ].sort((first, second) => first.startsOn.localeCompare(second.startsOn))
  }

  /** Whether the owner blocked any day from `from` to `to` on the face or the whole board. */
  static blocked(board: Board, face: BoardFace, from: string, to: string): Promise<boolean> {
    return Booking.blocks(board, face, from, to).exists()
  }

  private static blocks(board: Board, face: BoardFace, from: string, to: string) {
    return AvailabilityBlock.query()
      .where({ boardId: board.id })
      .whereRaw('(face_id is null or face_id = ?) and ends_on >= ? and starts_on <= ?', [face.id, from, to])
  }

  /** Whether the database turned a booking away for sharing days with another. */
  private static isOverlap(error: unknown): boolean {
    const failure = error as { code?: string; message?: string; cause?: { code?: string } }

    return failure?.code === '23P01' || failure?.cause?.code === '23P01' || String(failure?.message ?? '').includes('bookings_no_overlap')
  }

  /**
   * Accept every proof the advertiser left unchecked past the deadline, and pay it out.
   * An open dispute holds the money, when the settings say so.
   * Runs on the schedule, a page at a time.
   */
  static async acceptOverdueProofs(): Promise<number> {
    const hours = await Settings.number('proofs.accept_hours')
    const paused = !!(await Settings.get('disputes.pause_auto_accept'))
    const due = await Booking.query()
      .where({ proofStatus: 'submitted' })
      .whereRaw('proof_submitted_at < now() - make_interval(hours => ?)', [hours])
      .when(paused, (query) => query.whereRaw("not exists (select 1 from disputes where disputes.booking_id = bookings.id and disputes.status = 'open')"))
      .oldest('proofSubmittedAt')
      .limit(100)
      .get()

    let accepted = 0

    for (const booking of due.all()) if (await booking.acceptProof()) accepted++

    return accepted
  }

  /** Bookings whose last day has passed are done. */
  static async completeEnded(): Promise<void> {
    await Booking.query().where({ status: Booking.LIVE }).whereRaw('ends_on < current_date').updateFrom({ status: Booking.COMPLETED })
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

  payments() {
    return this.hasMany(Payment, 'bookingId')
  }

  proofs() {
    return this.hasMany(PostingProof, 'bookingId')
  }

  ledgerEntries() {
    return this.hasMany(LedgerEntry, 'bookingId')
  }

  /** Bookings an advertiser made, or holds a share of. */
  scopeMadeBy(query: QueryBuilder<Booking>, user: User): QueryBuilder<Booking> {
    return query.whereRaw('(advertiser_id = ? or (shared and id in (select booking_id from booking_shares where user_id = ?)))', [user.id, user.id])
  }

  /** Bookings on boards `user` tagged or owns. */
  scopeOnBoardsOf(query: QueryBuilder<Booking>, user: User): QueryBuilder<Booking> {
    return query.whereRaw(
      'board_id in (select id from boards where tagged_by_id = ? or owner_profile_id in (select id from owner_profiles where user_id = ?))',
      [user.id, user.id],
    )
  }

  /** What the board itself costs, without printing. The owner, scout and Greyboards share this. */
  rentMinor(): number {
    return this.amountMinor - this.printFeeMinor
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

  /** The advertiser lets go of a hold. A paid booking is cancelled through `Refunds`, which works out the money back. */
  async cancel(): Promise<void> {
    abortIf(this.status !== Booking.HELD, 'Only a booking that isn’t paid yet can be let go of here.', 422)

    await this.update({ status: Booking.CANCELLED, cancelledAt: new Date(), holdExpiresAt: null })

    if (this.shared) await Shares.refundAll(this, 'The organiser let go of the shared booking')
  }

  /**
   * Record the advertiser's payment: the money goes into escrow and the split is fixed.
   * A payment that lands after its hold ran out still counts if the days are free; if
   * someone else took them meanwhile, the booking is cancelled and the money is owed back.
   * A payment for shares of a shared booking goes through `Shares`.
   */
  async markPaid(payment: Payment): Promise<void> {
    if (this.shared) return Shares.paid(this, payment)

    if (!(await this.confirmPaid())) {
      await this.record('refund', 'payment_refund_due', this.amountMinor, payment.reference, 'Paid after the hold ran out and the days were taken')
      await Refunds.forPayment(this, payment, 'Paid after the hold ran out and the days were taken')

      return
    }

    await this.record('escrow', 'payment_in', this.amountMinor, payment.reference, 'Held until the artwork is up')
  }

  /**
   * All the money is in: the booking is paid, its split fixed, and the owner told. Returns
   * false, cancelling it, when its hold ran out and someone else took the days meanwhile.
   */
  async confirmPaid(): Promise<boolean> {
    const board = await this.board().firstOrFail()
    const split = await Commissions.split(board, this.rentMinor(), await OwnerPricing.fixedFor(board, this.faceId, this.periods))
    const paidAt = new Date()

    try {
      await this.update({ status: Booking.PAID, holdExpiresAt: null, paidAt, ...split })
    } catch (error) {
      if (!Booking.isOverlap(error)) throw error

      await this.update({ status: Booking.CANCELLED, cancelledAt: paidAt, holdExpiresAt: null })

      return false
    }

    await this.tellOwner(board)

    return true
  }

  /** The advertiser's artwork, for the owner to check. A new file replaces one not yet approved. */
  async submitArtwork(file: UploadedFile): Promise<void> {
    abortIf(this.status !== Booking.PAID, 'Add artwork once the booking is paid.', 422)
    abortIf(this.artworkStatus === 'approved', 'The artwork is already approved and on its way to print.', 422)

    abortIf(this.shared, 'Each advertiser on a shared booking sends their own design, and the print merges them.', 422)

    await this.useArtwork(await StoredImage.save(`bookings/${this.id}/artwork`, file))
  }

  /** Put artwork up for the owner to check: the advertiser's, or a shared booking's merged designs. */
  async useArtwork(saved: SavedImage): Promise<void> {
    abortIf(this.status !== Booking.PAID, 'Add artwork once the booking is paid.', 422)
    abortIf(this.artworkStatus === 'approved', 'The artwork is already approved and on its way to print.', 422)

    await StoredImage.remove(this.artworkDisk, this.artworkPath)
    await this.update({
      artworkPath: saved.path,
      artworkDisk: saved.disk,
      artworkWidth: saved.width,
      artworkHeight: saved.height,
      artworkStatus: 'submitted',
      artworkNote: null,
      artworkReviewedById: null,
      artworkReviewedAt: null,
    })
  }

  /** The owner or scout approves the artwork, which puts the print job up for dispatchers, or sends it back with a note. */
  async reviewArtwork(reviewer: User, approve: boolean, note?: string | null): Promise<void> {
    abortIf(this.artworkStatus !== 'submitted', 'There is no artwork waiting for a check.', 422)
    abortIf(!approve && !note?.trim(), 'Say what to change so the advertiser can fix it.', 422)

    await this.update({
      artworkStatus: approve ? 'approved' : 'rejected',
      artworkNote: note?.trim() || null,
      artworkReviewedById: reviewer.id,
      artworkReviewedAt: new Date(),
    })

    if (approve) await PrintJob.open(this)
  }

  artworkUrl(): Promise<string | null> {
    return this.artworkPath && this.artworkDisk ? StoredImage.url(this.artworkDisk, this.artworkPath) : Promise.resolve(null)
  }

  /** A geotagged photo of the ad on the board. It must be taken at the board. */
  async addProof(user: User, file: UploadedFile, where: ProofLocation): Promise<PostingProof> {
    abortIf(this.status !== Booking.PAID || this.artworkStatus !== 'approved', 'Add proof once the artwork is approved and the ad is up.', 422)
    abortIf(this.proofStatus === 'submitted' || this.proofStatus === 'accepted', 'The proof is already with the advertiser.', 422)

    const board = await this.board().firstOrFail()
    const distanceM = PostingProof.distanceFrom(board, where)
    const maxDistance = await Settings.number('proofs.max_distance_m')
    const count = await PostingProof.query().where({ bookingId: this.id }).count()

    abortIf(distanceM > maxDistance, `This photo was taken ${distanceM} m from the board. Take it within ${maxDistance} m so the advertiser can trust it.`, 422)
    abortIf(count >= PostingProof.MAX_PER_BOOKING, `Keep it to ${PostingProof.MAX_PER_BOOKING} photos. Remove one first.`, 422)

    await this.stepInIfUnclaimed(user)

    return PostingProof.store(this, user, file, where, distanceM)
  }

  /** Someone looking after the board who posts proof while no dispatcher holds the job takes the job, and its fee, for the owner's side. */
  private async stepInIfUnclaimed(user: User): Promise<void> {
    const job = await PrintJob.query().where({ bookingId: this.id }).first()

    if (!job || !job.isAvailable() || job.isHeldBy(user)) return

    await job.stepIn()
    await this.update({ printedBy: 'owner' })
  }

  async removeProof(proof: PostingProof): Promise<void> {
    abortIf(proof.bookingId !== this.id, 'That photo isn’t part of this booking.', 404)
    abortIf(this.proofStatus === 'submitted' || this.proofStatus === 'accepted', 'The proof is already with the advertiser.', 422)

    await proof.remove()
  }

  /** Send the photos to the advertiser to check. The print job, if any, is posted. */
  async submitProof(): Promise<void> {
    const needed = await Settings.number('proofs.min_photos')
    const count = await PostingProof.query().where({ bookingId: this.id }).count()

    abortIf(this.status !== Booking.PAID || !['none', 'disputed'].includes(this.proofStatus), 'There is no proof to send for this booking.', 422)
    abortIf(count < needed, `Add at least ${needed} photos of the ad on the board.`, 422)

    await this.update({ proofStatus: 'submitted', proofSubmittedAt: new Date() })
    await PrintJob.query().where({ bookingId: this.id }).whereRaw('status <> ?', [PrintJob.CANCELLED]).updateFrom({ status: PrintJob.POSTED, postedAt: new Date() })
  }

  /**
   * The ad is up: the booking goes live and its money leaves escrow. Called by the
   * advertiser, for them once the time to check has passed, or by staff deciding a dispute
   * from any proof state. Returns false when someone else accepted it first.
   */
  async acceptProof(from: ProofStatus[] = ['submitted']): Promise<boolean> {
    const now = new Date()
    const accepted = await Booking.query()
      .where({ id: this.id, status: Booking.PAID })
      .whereIn('proofStatus', from)
      .updateFrom({ status: Booking.LIVE, proofStatus: 'accepted', proofAcceptedAt: now, releasedAt: now, proofNote: null })

    if (!accepted) return false

    Object.assign(this, { status: Booking.LIVE, proofStatus: 'accepted', proofAcceptedAt: now, releasedAt: now, proofNote: null })

    await Payouts.release(this)
    await Reputation.campaignChecked(this)
    await this.tellOwnerPaid()

    return true
  }

  /** The advertiser says what's wrong. New photos can be added and sent again. */
  async disputeProof(note: string): Promise<void> {
    abortIf(this.proofStatus !== 'submitted', 'There is no proof waiting for you to check.', 422)
    abortIf(!note.trim(), 'Say what’s wrong so it can be put right.', 422)

    await this.update({ proofStatus: 'disputed', proofNote: note.trim() })
    await PrintJob.query().where({ bookingId: this.id, status: PrintJob.POSTED }).updateFrom({ status: PrintJob.PRINTED, postedAt: null })
  }

  /** When an unchecked proof counts as accepted. */
  async proofDeadline(): Promise<Date | null> {
    if (this.proofStatus !== 'submitted' || !this.proofSubmittedAt) return null
    if ((await Settings.get('disputes.pause_auto_accept')) && (await Dispute.isOpenOn(this.id))) return null

    return new Date(this.proofSubmittedAt.getTime() + (await Settings.number('proofs.accept_hours')) * 3_600_000)
  }

  /** Add a line to this booking's ledger, for the advertiser or, on a shared booking, whoever paid. */
  async record(account: LedgerEntry['account'], kind: string, amountMinor: number, reference: string | null, memo: string, userId = this.advertiserId): Promise<void> {
    await LedgerEntry.query().create({ bookingId: this.id, account, kind, amountMinor, currency: this.currency, reference, memo, userId })
  }

  /** Text the owner that the ad is up and their share is on its way. */
  private async tellOwnerPaid(): Promise<void> {
    const profile = this.ownerProfileId ? await OwnerProfile.query().find(this.ownerProfileId) : null
    const board = await this.board().first()

    if (!profile?.phone || !board || !this.ownerAmountMinor) return

    await Sms.send(profile.phone, `The ad on "${board.name}" is up and checked. ${Money.format(this.ownerAmountMinor, this.currency)} is now due to you. - Greyboards`).catch(() => undefined)
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
