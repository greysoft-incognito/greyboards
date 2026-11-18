import { PaymentResource } from '@app/http/resources/PaymentResource'
import { PrintOfferCollection } from '@app/http/resources/PrintOfferCollection'
import { PrintOfferResource } from '@app/http/resources/PrintOfferResource'
import { Board } from '@app/models/Board'
import { Booking } from '@app/models/Booking'
import { PrintJob } from '@app/models/PrintJob'
import { PrintOffer } from '@app/models/PrintOffer'
import { BookingPolicy } from '@app/policies/BookingPolicy'
import { DispatchOffers } from '@app/services/DispatchOffers'
import { Checkout } from '@app/services/payments/Checkout'
import { Settings } from '@app/support/Settings'
import { RequestException, perPage } from '@arkstack/common'
import { GenericResource } from 'resora'
import { Reputation } from '@app/services/Reputation'
import { BaseController } from './BaseController'

/**
 * Pricing print jobs. Dispatchers keep a rate, send prices and answer requests; the
 * advertiser sees the prices, asks dispatchers nearby, and pays the one they pick.
 */
export default class PrintOfferController extends BaseController {
  /** The dispatcher's rate, or the starting one when they haven't set it. */
  async rate() {
    const rate = await DispatchOffers.rateOf(this.user)
    const starting = (await Settings.number('printing.price_per_sqm')) * 100

    return new GenericResource(
      rate
        ? { saved: true, pricePerSqmMinor: Number(rate.pricePerSqmMinor), minFeeMinor: Number(rate.minFeeMinor), latitude: rate.latitude, longitude: rate.longitude, radiusKm: rate.radiusKm, note: rate.note }
        : { saved: false, pricePerSqmMinor: starting, minFeeMinor: 0, latitude: null, longitude: null, radiusKm: await Settings.number('printing.search_radius_km'), note: null },
    ).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async saveRate() {
    const data = await this.validate({
      pricePerSqmMinor: 'required|integer|min:100|max:100000000',
      minFeeMinor: 'nullable|integer|min:0|max:1000000000',
      latitude: 'required|numeric|min:-90|max:90',
      longitude: 'required|numeric|min:-180|max:180',
      radiusKm: 'required|integer|min:1|max:200',
      note: 'nullable|string|max:200',
    })

    await DispatchOffers.saveRate(this.user, {
      pricePerSqmMinor: Number(data.pricePerSqmMinor),
      minFeeMinor: Number(data.minFeeMinor ?? 0),
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      radiusKm: Number(data.radiusKm),
      note: data.note?.trim() || null,
    })

    return (await this.rate()).additional({ status: 'success', message: 'Your prices are saved.', code: 200 })
  }

  /** The dispatcher's prices and the requests made to them, newest first. */
  async mine() {
    const offers = await DispatchOffers.mine(this.user).paginate(perPage(this.query, { perPage: 20, maxPerPage: 50 }))

    return new PrintOfferCollection(offers).withJob().additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** Send a price for a job. */
  async bid() {
    const job = await PrintJob.query().find(String(this.params.job))

    if (!job) throw new RequestException('Job not found.', 404)

    const data = await this.validate({ amountMinor: 'required|integer|min:100|max:10000000000', note: 'nullable|string|max:200' })
    const offer = await DispatchOffers.bid(job, this.user, Number(data.amountMinor), data.note?.trim() || null)

    return new PrintOfferResource(offer).additional({ status: 'success', message: 'Price sent. The job is yours if the advertiser pays it.', code: 201 }).response().setStatusCode(201)
  }

  async accept() {
    const offer = await DispatchOffers.answer(await this.offer(), this.user, true)

    return new PrintOfferResource(offer).additional({ status: 'success', message: 'Accepted. The job is yours once the advertiser pays.', code: 200 })
  }

  async decline() {
    const offer = await DispatchOffers.answer(await this.offer(), this.user, false)

    return new PrintOfferResource(offer).additional({ status: 'success', message: 'Request declined.', code: 200 })
  }

  async withdraw() {
    const offer = await this.offer()

    await DispatchOffers.withdraw(offer, this.user)

    return new PrintOfferResource(offer).additional({ status: 'success', message: 'Price taken back.', code: 200 })
  }

  /** For the advertiser: the prices on their job, and dispatchers nearby they can ask. */
  async forBooking() {
    const booking = await this.booking()
    const job = await PrintJob.query().where({ bookingId: booking.id }).first()
    const open = !!job && DispatchOffers.takesPrices(job)
    const board = await Board.query().findOrFail(booking.boardId)
    const offers = open ? await DispatchOffers.live(job!) : []
    const asked = new Set(offers.map((offer) => offer.dispatcherId))
    const nearby = open ? await DispatchOffers.nearby(board) : []
    const standings = await Reputation.standings(nearby.map((entry) => entry.user.id), 'dispatch')

    return new GenericResource({
      open,
      offers: await Promise.all(offers.map((offer) => new PrintOfferResource(offer).data())),
      dispatchers: await Promise.all(
        nearby.map(async (entry) => ({
          id: entry.user.id,
          name: entry.user.name,
          avatarUrl: await entry.user.avatarUrl(),
          quoteMinor: entry.quoteMinor,
          distanceM: entry.distanceM,
          note: entry.rate.note,
          asked: asked.has(entry.user.id),
          standing: standings.get(entry.user.id) ?? null,
        })),
      ),
      maxRequests: await Settings.number('printing.max_requests'),
    }).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** The advertiser asks one dispatcher to do the job at their rate. */
  async request() {
    const booking = await this.booking()
    const data = await this.validate({ dispatcherId: 'required|string' })
    const offer = await DispatchOffers.request(booking, String(data.dispatcherId))

    return new PrintOfferResource(offer).additional({ status: 'success', message: 'Request sent. You can pay once they accept.', code: 201 }).response().setStatusCode(201)
  }

  /** The advertiser pays a price; the job is that dispatcher's once it's paid. */
  async checkout() {
    const booking = await this.booking()
    const offer = await DispatchOffers.payable(booking, String(this.params.offer))
    const { payment, url } = await new Checkout().startPrint(booking, offer, this.user)

    return new PaymentResource(payment).withCheckout(url).additional({ status: 'success', message: 'Payment started', code: 201 }).response().setStatusCode(201)
  }

  /** A paid booking the account made. Only they pick and pay who prints it. */
  private async booking(): Promise<Booking> {
    const booking = await Booking.query().find(String(this.params.booking))

    if (!booking || !(await BookingPolicy.view(this.user, booking))) throw new RequestException('Booking not found.', 404)
    if (!BookingPolicy.owns(this.user, booking)) throw new RequestException('Only the person who booked picks who prints it.', 403)

    return booking
  }

  private async offer(): Promise<PrintOffer> {
    const offer = await PrintOffer.query().find(String(this.params.offer))

    if (!offer || offer.dispatcherId !== this.user.id) throw new RequestException('Quote not found.', 404)

    return offer
  }
}
