import { BookingResource } from '@app/http/resources/BookingResource'
import { Booking } from '@app/models/Booking'
import { Shares } from '@app/services/Shares'
import { BaseController } from './BaseController'
import { GenericResource } from 'resora'

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
}
