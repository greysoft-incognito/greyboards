import { AccountRole } from '@app/models/AccountRole'
import { Board } from '@app/models/Board'
import { Booking } from '@app/models/Booking'
import { DispatchRate } from '@app/models/DispatchRate'
import { LedgerEntry } from '@app/models/LedgerEntry'
import type { Payment } from '@app/models/Payment'
import { PrintJob } from '@app/models/PrintJob'
import { PrintOffer } from '@app/models/PrintOffer'
import { User } from '@app/models/User'
import { Refunds } from '@app/services/Refunds'
import { Day } from '@app/support/Day'
import { Settings } from '@app/support/Settings'
import { abortIf } from '@arkstack/common'

/** Offers listed on one job, and dispatchers offered for requests, at most. */
const LIMIT = 20

/** A dispatcher an advertiser can ask, with their price for the board. */
export interface DispatcherNearby {
  user: User
  rate: DispatchRate
  quoteMinor: number
  distanceM: number
}

/**
 * Dispatchers price print jobs: each sends a price (a bid), or the advertiser asks one at
 * their rate (a request) and they accept or decline. The advertiser pays the price they
 * pick, and the job is that dispatcher's. The one place offers are made, answered and paid.
 */
export class DispatchOffers {
  /** The job a paid booking's dispatchers price, or a 422 when it has none waiting for prices. */
  static async jobFor(booking: Booking): Promise<PrintJob> {
    const job = await PrintJob.query().where({ bookingId: booking.id }).first()

    abortIf(!job || !DispatchOffers.takesPrices(job), 'This booking has no print job waiting for prices.', 422)

    return job!
  }

  /** An open job nobody has paid a price for yet, before its go-live date. */
  static takesPrices(job: PrintJob): boolean {
    return job.status === PrintJob.OPEN && !job.isPriced() && Day.of(job.dueOn) > Day.today()
  }

  /** The dispatcher's rate, if they set one. */
  static rateOf(user: User): Promise<DispatchRate | null> {
    return DispatchRate.query().where({ userId: user.id }).first()
  }

  static async saveRate(user: User, values: Pick<DispatchRate, 'pricePerSqmMinor' | 'minFeeMinor' | 'latitude' | 'longitude' | 'radiusKm' | 'note'>): Promise<DispatchRate> {
    return DispatchRate.query().updateOrCreate({ userId: user.id }, values)
  }

  /** A dispatcher's price for `job`. A new price replaces their earlier bid. */
  static async bid(job: PrintJob, user: User, amountMinor: number, note: string | null): Promise<PrintOffer> {
    abortIf(!DispatchOffers.takesPrices(job), 'This job isn’t taking prices any more.', 422)

    const live = await PrintOffer.query().where({ printJobId: job.id, dispatcherId: user.id }).whereIn('status', PrintOffer.LIVE).first()

    abortIf(live?.status === 'requested', 'The advertiser asked you about this job. Accept or decline their request instead.', 409)

    const expiresAt = await DispatchOffers.expiry(job, 'printing.offer_hours')

    if (live) {
      await live.update({ amountMinor, note, expiresAt, kind: 'bid' })

      return live
    }

    return PrintOffer.query().create({ printJobId: job.id, dispatcherId: user.id, kind: 'bid', status: 'pending', amountMinor, note, expiresAt })
  }

  /** The advertiser asks one dispatcher to do the job at their rate. */
  static async request(booking: Booking, dispatcherId: string): Promise<PrintOffer> {
    const job = await DispatchOffers.jobFor(booking)
    const board = await Board.query().findOrFail(booking.boardId)
    const nearby = (await DispatchOffers.nearby(board)).find((entry) => entry.user.id === dispatcherId)

    abortIf(!nearby, 'That dispatcher doesn’t work near this board.', 422)

    const already = await PrintOffer.query().where({ printJobId: job.id, dispatcherId }).whereIn('status', PrintOffer.LIVE).whereRaw('expires_at > now()').exists()

    abortIf(already, 'That dispatcher already has a price or a request on this job.', 409)

    const waiting = await PrintOffer.query().where({ printJobId: job.id, kind: 'request', status: 'requested' }).whereRaw('expires_at > now()').count()
    const max = await Settings.number('printing.max_requests')

    abortIf(waiting >= max, `You can ask ${max} dispatchers at a time. Wait for an answer, or pick a price you have.`, 429)

    await PrintOffer.query().where({ printJobId: job.id, dispatcherId }).whereIn('status', PrintOffer.LIVE).updateFrom({ status: 'closed' })

    return PrintOffer.query().create({
      printJobId: job.id,
      dispatcherId,
      kind: 'request',
      status: 'requested',
      amountMinor: nearby!.quoteMinor,
      note: null,
      expiresAt: await DispatchOffers.expiry(job, 'printing.request_hours'),
    })
  }

  /** The dispatcher accepts a request at its price, which the advertiser can then pay, or declines it. */
  static async answer(offer: PrintOffer, user: User, accept: boolean): Promise<PrintOffer> {
    abortIf(offer.dispatcherId !== user.id, 'That request is for someone else.', 404)
    abortIf(offer.status !== 'requested' || !offer.isLive(), 'This request isn’t waiting for you any more.', 422)

    const job = await PrintJob.query().findOrFail(offer.printJobId)

    abortIf(accept && !DispatchOffers.takesPrices(job), 'This job isn’t taking prices any more.', 422)

    await offer.update(accept ? { status: 'pending', expiresAt: await DispatchOffers.expiry(job, 'printing.offer_hours') } : { status: 'declined' })

    return offer
  }

  /** The dispatcher takes back a price the advertiser hasn't paid. */
  static async withdraw(offer: PrintOffer, user: User): Promise<void> {
    abortIf(offer.dispatcherId !== user.id, 'That price is someone else’s.', 404)
    abortIf(offer.status !== 'pending', 'Only a price that isn’t paid can be taken back.', 422)

    await offer.update({ status: 'withdrawn' })
  }

  /** A price the advertiser can pay now, or a 422. */
  static async payable(booking: Booking, offerId: string): Promise<PrintOffer> {
    const job = await DispatchOffers.jobFor(booking)
    const offer = await PrintOffer.query().where({ id: offerId, printJobId: job.id }).first()

    abortIf(!offer, 'Price not found.', 404)
    abortIf(offer!.status !== 'pending' || !offer!.isLive(), 'This price isn’t open any more. Pick another, or ask a dispatcher.', 422)

    return offer!
  }

  /**
   * The advertiser paid `payment` for a price: the job is that dispatcher's, the fee joins the
   * booking's money in escrow, and every other offer closes. If the job closed or someone
   * else's price was paid meanwhile, the money goes back.
   */
  static async paid(payment: Payment): Promise<void> {
    const offer = await PrintOffer.query().findOrFail(payment.printOfferId!)
    const booking = await Booking.query().findOrFail(payment.bookingId)
    const taken =
      booking.status === Booking.PAID &&
      (await PrintJob.query()
        .where({ id: offer.printJobId, status: PrintJob.OPEN, feeMinor: 0 })
        .updateFrom({ status: PrintJob.CONFIRMED, dispatcherId: offer.dispatcherId, feeMinor: offer.amountMinor, confirmedAt: new Date(), reservedUntil: null }))

    if (!taken) {
      const reason = 'Paid for printing after the job was taken or closed'

      await LedgerEntry.query().create({ bookingId: booking.id, account: 'refund', kind: 'payment_refund_due', amountMinor: payment.amountMinor, currency: payment.currency, reference: payment.reference, userId: payment.userId, memo: reason })
      await Refunds.forPayment(booking, payment, reason)

      return
    }

    await offer.update({ status: 'paid' })
    await PrintOffer.query().where({ printJobId: offer.printJobId }).whereIn('status', PrintOffer.LIVE).updateFrom({ status: 'closed' })
    await booking.update({ printFeeMinor: booking.printFeeMinor + offer.amountMinor, amountMinor: booking.amountMinor + offer.amountMinor })
    await LedgerEntry.query().create({ bookingId: booking.id, account: 'escrow', kind: 'payment_in', amountMinor: payment.amountMinor, currency: payment.currency, reference: payment.reference, userId: payment.userId, memo: 'Printing and posting, held until the ad is up' })
  }

  /** Close every offer still open on `job`, such as when the owner's side steps in or the booking is cancelled. */
  static async close(job: PrintJob): Promise<void> {
    await PrintOffer.query().where({ printJobId: job.id }).whereIn('status', PrintOffer.LIVE).updateFrom({ status: 'closed' })
  }

  /** The offers on `job` the advertiser can still act on, cheapest first. */
  static async live(job: PrintJob): Promise<PrintOffer[]> {
    const offers = await PrintOffer.query().where({ printJobId: job.id }).whereIn('status', PrintOffer.LIVE).whereRaw('expires_at > now()').orderBy({ amountMinor: 'asc' }).limit(LIMIT).get()

    return offers.all()
  }

  /** Active dispatchers whose area covers `board`, nearest first, each with their price for it. */
  static async nearby(board: Board): Promise<DispatcherNearby[]> {
    const point = 'ST_SetSRID(ST_MakePoint(dispatch_rates.longitude, dispatch_rates.latitude), 4326)::geography'
    const at = 'ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography'
    const rates = await DispatchRate.query()
      .whereRaw(`ST_DWithin(${point}, ${at}, dispatch_rates.radius_km * 1000)`, [Number(board.longitude), Number(board.latitude)])
      .whereRaw("user_id in (select user_id from account_roles where kind = 'dispatch' and status = ?)", [AccountRole.ACTIVE])
      .orderByRaw(`${point} <-> ${at}`, [Number(board.longitude), Number(board.latitude)], 'asc')
      .limit(LIMIT)
      .get()
    const users = rates.all().length ? (await User.query().whereIn('id', rates.all().map((rate) => rate.userId)).get()).all() : []

    return rates.all().flatMap((rate) => {
      const user = users.find((entry) => entry.id === rate.userId)

      return user ? [{ user, rate, quoteMinor: rate.quote(board), distanceM: Math.round(DispatchOffers.distance(rate, board)) }] : []
    })
  }

  /** Offers and requests made to `user`, newest first. */
  static mine(user: User) {
    return PrintOffer.query().where({ dispatcherId: user.id }).latest('updatedAt')
  }

  /** `hours` setting from now, but never past the job's go-live date. */
  private static async expiry(job: PrintJob, setting: string): Promise<Date> {
    const until = Date.now() + (await Settings.number(setting)) * 3_600_000
    const due = new Date(`${Day.of(job.dueOn)}T00:00:00Z`).getTime()

    return new Date(Math.min(until, due))
  }

  /** Metres between the dispatcher's base and the board, on the earth's surface. */
  private static distance(rate: DispatchRate, board: Board): number {
    const rad = (deg: number) => (deg * Math.PI) / 180
    const dLat = rad(Number(board.latitude) - rate.latitude)
    const dLng = rad(Number(board.longitude) - rate.longitude)
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(rate.latitude)) * Math.cos(rad(Number(board.latitude))) * Math.sin(dLng / 2) ** 2

    return 6_371_000 * 2 * Math.asin(Math.sqrt(a))
  }
}
