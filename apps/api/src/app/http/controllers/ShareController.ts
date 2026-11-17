import { BookingResource } from '@app/http/resources/BookingResource'
import { Booking } from '@app/models/Booking'
import { Shares } from '@app/services/Shares'
import { BookingShare } from '@app/models/BookingShare'
import { imageFile } from '@app/support/rules'
import { Settings } from '@app/support/Settings'
import { RequestException } from '@arkstack/common'
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
}
