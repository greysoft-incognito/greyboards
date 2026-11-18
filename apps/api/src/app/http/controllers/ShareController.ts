import { BookingResource } from '@app/http/resources/BookingResource'
import { Booking } from '@app/models/Booking'
import { Shares } from '@app/services/Shares'
import { BookingShare } from '@app/models/BookingShare'
import { imageFile } from '@app/support/rules'
import { Settings } from '@app/support/Settings'
import { RequestException } from '@arkstack/common'
import { BaseController } from './BaseController'
import { GenericResource } from 'resora'
import { PaymentResource } from '@app/http/resources/PaymentResource'
import { SharedBookingResource } from '@app/http/resources/SharedBookingResource'
import { AuctionResource } from '@app/http/resources/AuctionResource'
import { Checkout } from '@app/services/payments/Checkout'

/** Shared bookings: joining one from its invite link, and the organiser covering the rest. */
export default class ShareController extends BaseController {
  /** What an invite link offers: the board, the dates and the share's amount. */
  async show() {
    const { share, booking } = await Shares.byToken(String(this.params.token))
    const board = await booking.board().first()
    const organiser = await booking.advertiser().first()

    return new GenericResource({
      position: share.position,
      count: (await Shares.of(booking)).all().length,
      amountMinor: share.amountMinor,
      currency: booking.currency,
      status: share.status,
      mine: share.userId === this.user.id,
      open: booking.isHeld() && share.status === 'open',
      payBy: booking.holdExpiresAt,
      organiser: organiser?.name ?? null,
      booking: await new BookingResource(booking).onBoard(board).data(),
    }).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** Take the share, so it's yours to pay. */
  async claim() {
    const { share, booking } = await Shares.byToken(String(this.params.token))

    await Shares.claim(share, booking, this.user)

    return new BookingResource(booking).withDetails(this.user).additional({ status: 'success', message: 'The share is yours. Pay it to book your part.', code: 200 })
  }

  /** The organiser takes every unpaid share to pay it themselves. */
  async cover() {
    const booking = await Booking.query().findOrFail(String(this.params.booking))
    const covered = await Shares.cover(booking, this.user)
    const message = covered ? `You now hold ${covered} more ${covered === 1 ? 'share' : 'shares'}. Pay them to book the dates.` : 'Every other share is already yours or paid.'

    return new BookingResource(booking).withDetails(this.user).additional({ status: 'success', message, code: 200 })
  }

  /** Whoever holds a paid share sends its design. Once all are in, they're merged into the print. */
  async design() {
    const booking = await Booking.query().findOrFail(String(this.params.booking))
    const share = await BookingShare.query().where({ id: String(this.params.share), bookingId: booking.id }).first()

    if (!share) throw new RequestException('Share not found.', 404)

    const data = await this.validate({ design: imageFile((await Settings.number('uploads.max_image_mb')) * 1024) })
    const merged = await Shares.sendDesign(booking, share, this.user, data.design)
    const message = merged ? 'Design sent. Everyone’s designs are merged and with the board’s side to check.' : 'Design sent. The print is merged once everyone has sent theirs.'

    return new BookingResource(await Booking.query().findOrFail(booking.id)).withDetails(this.user).additional({ status: 'success', message, code: 200 })
  }

  /** Shared bookings anyone can join: on one board, near a point, or all, soonest to lapse first. */
  async open() {
    const query = await this.validateQuery({
      boardId: 'nullable|string',
      lat: 'nullable|numeric|min:-90|max:90',
      lng: 'nullable|numeric|min:-180|max:180',
      radiusKm: 'nullable|numeric|min:1|max:200',
    })
    const near = query.lat !== undefined && query.lat !== null && query.lng !== undefined && query.lng !== null ? { latitude: Number(query.lat), longitude: Number(query.lng), radiusKm: Number(query.radiusKm ?? 50) } : undefined
    const bookings = await Shares.discoverable({ boardId: query.boardId ? String(query.boardId) : undefined, near })
    const data = await Promise.all(bookings.all().map((booking) => new SharedBookingResource(booking).for(this.user).data()))

    return new GenericResource(data).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** Join a listed shared booking: the first open share is yours to pay. */
  async join() {
    const booking = await this.listed()

    await Shares.join(booking, this.user)

    return new BookingResource(booking).withDetails(this.user).additional({ status: 'success', message: 'The share is yours. Pay it to book your part.', code: 200 })
  }

  /** Bid for the whole board once the lock ended. The first bid opens the bidding. */
  async takeover() {
    const booking = await this.listed()
    const data = await this.validate({ amountMinor: 'required|integer|min:1' })
    const auction = await Shares.bidToTake(booking, this.user, Number(data.amountMinor))

    return new AuctionResource(auction).for(this.user).additional({ status: 'success', message: 'Bid placed.', code: 200 })
  }

  /** The winning bidder pays for the whole board; the sharers get their money back. */
  async payTakeover() {
    const booking = await this.listed()
    const { payment, url } = await new Checkout().startTakeover(booking, this.user)

    return new PaymentResource(payment).withCheckout(url).additional({ status: 'success', message: 'Payment started', code: 201 }).response().setStatusCode(201)
  }

  private async listed(): Promise<Booking> {
    const booking = await Booking.query().find(String(this.params.booking))

    if (!booking || !booking.shared) throw new RequestException('Shared booking not found.', 404)

    return booking
  }
}
