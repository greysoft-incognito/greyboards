import { Model } from '@arkstack/database'
import { abortIf } from '@arkstack/common'
import { raw, type QueryBuilder } from 'arkormx'
import { Day } from '@app/support/Day'
import { Settings } from '@app/support/Settings'
import { StoredImage } from '@app/support/StoredImage'
import { Board } from './Board'
import { Booking } from './Booking'
import { PrintOffer } from './PrintOffer'
import type { UploadedFile, User } from './User'

/**
 * `open` for dispatchers nearby to price, `reserved` while one decides on a job that went
 * back at its paid price, `confirmed` once it's theirs, `printed` when the finished print is photographed, `posted` once it's up.
 */
export type PrintJobStatus = 'open' | 'reserved' | 'confirmed' | 'printed' | 'posted' | 'cancelled'

/**
 * Printing a booking's approved artwork and putting it up on the board. Dispatchers find
 * jobs near them and send their prices (see `DispatchOffers`); the job is theirs once the
 * advertiser pays one. The fee is held with the booking and paid out once the ad is up.
 */
export class PrintJob extends Model {
  declare id: string
  declare bookingId: string
  declare boardId: string
  declare dispatcherId: string | null
  declare status: PrintJobStatus
  declare feeMinor: number
  declare currency: string
  declare dueOn: Date | string
  declare reservedUntil: Date | null
  declare confirmedAt: Date | null
  declare printPhotoPath: string | null
  declare printPhotoDisk: string | null
  declare printedAt: Date | null
  declare postedAt: Date | null
  /** Extra pay added when the job went back close to go-live. */
  declare bonusMinor: number
  /** When whoever looks after the board was told nobody had taken the job. */
  declare unclaimedAlertAt: Date | null
  declare createdAt: Date
  declare updatedAt: Date
  /** Metres from the search point, on jobs found with `near`. */
  declare distanceM?: number | null

  static readonly OPEN: PrintJobStatus = 'open'
  static readonly RESERVED: PrintJobStatus = 'reserved'
  static readonly CONFIRMED: PrintJobStatus = 'confirmed'
  static readonly PRINTED: PrintJobStatus = 'printed'
  static readonly POSTED: PrintJobStatus = 'posted'
  static readonly CANCELLED: PrintJobStatus = 'cancelled'

  /** Jobs one dispatcher can hold before confirming any. */
  static readonly MAX_RESERVED = 3

  /** Jobs a search returns. */
  static readonly SEARCH_LIMIT = 50

  protected static override table = 'print_jobs'

  protected static override columns = {
    bookingId: 'booking_id',
    boardId: 'board_id',
    dispatcherId: 'billposter_id',
    feeMinor: 'fee_minor',
    dueOn: 'due_on',
    reservedUntil: 'reserved_until',
    confirmedAt: 'confirmed_at',
    printPhotoPath: 'print_photo_path',
    printPhotoDisk: 'print_photo_disk',
    printedAt: 'printed_at',
    postedAt: 'posted_at',
    bonusMinor: 'bonus_minor',
    unclaimedAlertAt: 'unclaimed_alert_at',
  }

  protected override casts = {
    feeMinor: 'number',
    bonusMinor: 'number',
  } as never

  /**
   * What printing and posting `board`'s face adds to a booking, in minor units. Only an owner
   * who prints their own boards prices it up front: their own price, else the starting rate.
   * Otherwise dispatchers price the job once the artwork is approved, so it starts at 0.
   */
  static async feeFor(board: Board): Promise<number> {
    if (board.kind === 'digital' || !board.printsOwn) return 0
    if (board.printFeeMinor !== null && board.printFeeMinor !== undefined) return Number(board.printFeeMinor)

    const perSqm = await Settings.number('printing.price_per_sqm')

    return Math.round(Number(board.widthM) * Number(board.heightM) * perSqm) * 100
  }

  /**
   * Put a booking's job up for dispatchers once its artwork is approved, to send their prices.
   * Owners who print their own boards, and digital boards, need no job.
   */
  static async open(booking: Booking): Promise<PrintJob | null> {
    if (booking.printedBy === 'owner') return null

    const board = await Board.query().find(booking.boardId)

    if (!board || board.kind === 'digital') return null

    const existing = await PrintJob.query().where({ bookingId: booking.id }).first()

    if (existing) return existing

    return PrintJob.query().create({
      bookingId: booking.id,
      boardId: booking.boardId,
      status: PrintJob.OPEN,
      feeMinor: 0,
      currency: booking.currency,
      dueOn: Day.of(booking.startsOn),
    })
  }

  /** Jobs any dispatcher can take: open, or reserved by someone whose hold ran out. */
  scopeAvailable(query: QueryBuilder<PrintJob>): QueryBuilder<PrintJob> {
    return query.where((match: QueryBuilder<PrintJob>) =>
      match.where({ status: PrintJob.OPEN }).orWhereRaw('(status = ? and reserved_until < now())', [PrintJob.RESERVED]),
    )
  }

  /** Jobs whose board is within `radiusKm` of a point, nearest first, each with its `distanceM`. */
  scopeNear(query: QueryBuilder<PrintJob>, latitude: number, longitude: number, radiusKm: number): QueryBuilder<PrintJob> {
    const point = 'ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography'
    const location = '(select location from boards where boards.id = print_jobs.board_id)'

    return query
      .addSelect({ distance_m: raw(`ST_Distance(${location}, ${point})`, [longitude, latitude]) })
      .whereRaw(`ST_DWithin(${location}, ${point}, ?)`, [longitude, latitude, radiusKm * 1000])
      .orderByRaw(`${location} <-> ${point}`, [longitude, latitude], 'asc')
  }

  /** Jobs a dispatcher holds or has taken. */
  scopeTakenBy(query: QueryBuilder<PrintJob>, user: User): QueryBuilder<PrintJob> {
    return query.where({ dispatcherId: user.id })
  }

  booking() {
    return this.belongsTo(Booking, 'bookingId')
  }

  board() {
    return this.belongsTo(Board, 'boardId')
  }

  /**
   * Whether the advertiser paid a price for the job. An open job without one takes prices
   * from dispatchers; a priced one that went back after a miss is taken as it stands.
   */
  isPriced(): boolean {
    return Number(this.feeMinor) > 0
  }

  /** What the dispatcher earns: the fee plus any rush bonus. */
  payMinor(): number {
    return Number(this.feeMinor) + Number(this.bonusMinor ?? 0)
  }

  /** Whoever looks after the board does it themselves, so dispatchers no longer see the job. */
  async stepIn(): Promise<void> {
    await this.update({ status: PrintJob.CANCELLED, dispatcherId: null, reservedUntil: null })
    await PrintOffer.query().where({ printJobId: this.id }).whereIn('status', PrintOffer.LIVE).updateFrom({ status: 'closed' })
  }

  isAvailable(): boolean {
    return this.status === PrintJob.OPEN || (this.status === PrintJob.RESERVED && !this.reservationLive())
  }

  /** Whether `user` holds this job, by a live reservation or by confirming it. */
  isHeldBy(user: User): boolean {
    if (this.dispatcherId !== user.id) return false

    return this.status === PrintJob.RESERVED ? this.reservationLive() : [PrintJob.CONFIRMED, PrintJob.PRINTED, PrintJob.POSTED].includes(this.status)
  }

  /** A reservation that ran out shows as open again. */
  displayStatus(): PrintJobStatus {
    return this.status === PrintJob.RESERVED && !this.reservationLive() ? PrintJob.OPEN : this.status
  }

  private reservationLive(): boolean {
    return !!this.reservedUntil && this.reservedUntil.getTime() > Date.now()
  }

  /** Hold the job for `user` while they check they can print and post it in time. */
  async reserve(user: User): Promise<PrintJob> {
    abortIf(!this.isAvailable(), 'Someone else has this job.', 409)
    abortIf(!this.isPriced(), 'Send your price for this job. The advertiser picks who prints it.', 422)

    const holding = await PrintJob.query().where({ dispatcherId: user.id, status: PrintJob.RESERVED }).whereRaw('reserved_until > now()').count()

    abortIf(holding >= PrintJob.MAX_RESERVED, `You can hold ${PrintJob.MAX_RESERVED} jobs at once. Confirm or let one go first.`, 429)

    const hours = await Settings.number('printing.reserve_hours')
    const claimed = await PrintJob.query()
      .where({ id: this.id })
      .scope('available')
      .updateFrom({ status: PrintJob.RESERVED, dispatcherId: user.id, reservedUntil: new Date(Date.now() + hours * 3_600_000) })

    abortIf(!claimed, 'Someone else just took this job.', 409)

    return PrintJob.query().findOrFail(this.id)
  }

  /** The job becomes `user`'s; other dispatchers stop seeing it. */
  async confirm(user: User): Promise<void> {
    abortIf(this.status !== PrintJob.RESERVED || !this.isHeldBy(user), 'Reserve the job first. Your hold may have run out.', 422)

    await this.update({ status: PrintJob.CONFIRMED, confirmedAt: new Date(), reservedUntil: null })
  }

  /** Give the job back to the marketplace before printing it. */
  async release(user: User): Promise<void> {
    abortIf(!this.isHeldBy(user) || ![PrintJob.RESERVED, PrintJob.CONFIRMED].includes(this.status), 'You can only let go of a job you hold and haven’t printed.', 422)

    await this.update({ status: PrintJob.OPEN, dispatcherId: null, reservedUntil: null, confirmedAt: null })
  }

  /** A photo of the finished print, before it goes up, so a wrong print is caught early. */
  async addPrintPhoto(user: User, file: UploadedFile): Promise<void> {
    abortIf(!this.isHeldBy(user) || ![PrintJob.CONFIRMED, PrintJob.PRINTED].includes(this.status), 'Confirm the job before adding the print.', 422)

    const saved = await StoredImage.save(`print-jobs/${this.id}`, file)

    await StoredImage.remove(this.printPhotoDisk, this.printPhotoPath)
    await this.update({ status: PrintJob.PRINTED, printPhotoPath: saved.path, printPhotoDisk: saved.disk, printedAt: new Date() })
  }

  printPhotoUrl(): Promise<string | null> {
    return this.printPhotoPath && this.printPhotoDisk ? StoredImage.url(this.printPhotoDisk, this.printPhotoPath) : Promise.resolve(null)
  }
}
