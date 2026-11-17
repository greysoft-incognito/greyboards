import { Board } from '@app/models/Board'
import { Booking, type BookingStatus } from '@app/models/Booking'
import { BookingCollection } from '@app/http/resources/BookingCollection'
import { BookingResource } from '@app/http/resources/BookingResource'
import { Refunds } from '@app/services/Refunds'
import { Money } from '@app/support/Money'
import { BookingPolicy } from '@app/policies/BookingPolicy'
import { PaymentResource } from '@app/http/resources/PaymentResource'
import { Checkout } from '@app/services/payments/Checkout'
import { Day } from '@app/support/Day'
import { imageFile } from '@app/support/rules'
import { Settings } from '@app/support/Settings'
import { BaseController } from './BaseController'
import { GenericResource } from 'resora'
import { RequestException, perPage } from '@arkstack/common'

const STATUSES: BookingStatus[] = ['held', 'paid', 'live', 'completed', 'cancelled', 'expired']

/** Advertisers book boards; owners and scouts see the bookings on boards they look after. */
export default class BookingController extends BaseController {
  /** Days already taken on a board, for its calendar. Works signed out. */
  async availability() {
    const board = await Board.query().findOrFail(String(this.params.board))
    const query = await this.validateQuery({ from: 'nullable|date', to: 'nullable|date' })
    const from = query.from ? Day.of(String(query.from)) : Day.today()
    const to = query.to ? Day.of(String(query.to)) : Day.addDays(from, 365)

    if (!board.isListed()) throw new RequestException('Board not found.', 404)
    if (to < from || Day.addDays(from, 400) < to) throw new RequestException('Ask for up to a year at a time.', 422)

    return new GenericResource(await Booking.taken(board, from, to)).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** Hold the dates for the advertiser while they pay. */
  async create() {
    const board = await Board.query().findOrFail(String(this.params.board))
    const data = await this.validate({
      startsOn: 'required|date',
      periods: 'required|integer|min:1|max:52',
    })

    const booking = await Booking.hold(board, this.user, Day.of(String(data.startsOn)), Number(data.periods))

    return new BookingResource(booking).onBoard(board).additional({ status: 'success', message: 'Dates held. Pay to book them.', code: 201 }).response().setStatusCode(201)
  }

  /** Bookings the account made, newest first. */
  async index() {
    const filters = await this.validateQuery({ status: `nullable|in:${STATUSES.join(',')}` })
    const query = Booking.scope('madeBy', this.user)

    if (filters.status) query.where({ status: filters.status as BookingStatus })

    const bookings = await query.latest('createdAt').paginate(perPage(this.query, { perPage: 20, maxPerPage: 50 }))

    return new BookingCollection(bookings).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** Paid bookings on boards the account tagged or owns, soonest first. */
  async onMyBoards() {
    const bookings = await Booking.scope('onBoardsOf', this.user)
      .whereIn('status', ['paid', 'live', 'completed'])
      .latest('startsOn')
      .paginate(perPage(this.query, { perPage: 20, maxPerPage: 50 }))

    return new BookingCollection(bookings).withSplit(true).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async show() {
    const booking = await this.booking()
    const split = !BookingPolicy.owns(this.user, booking)

    return new BookingResource(booking).withSplit(split).withDetails(this.user).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** The advertiser sends their artwork for the owner to check. */
  async uploadArtwork() {
    const booking = await this.booking()

    if (!BookingPolicy.owns(this.user, booking)) throw new RequestException('Only the person who booked can add artwork.', 403)

    const data = await this.validate({ artwork: imageFile((await Settings.number('uploads.max_image_mb')) * 1024) })

    await booking.submitArtwork(data.artwork)

    return new BookingResource(booking).withDetails(this.user).additional({ status: 'success', message: 'Artwork sent for checking.', code: 200 })
  }

  /** Whoever looks after the board approves the artwork, or sends it back with a note. */
  async reviewArtwork() {
    const booking = await this.booking()

    if (!(await BookingPolicy.managesBoard(this.user, booking))) throw new RequestException('Only whoever looks after the board can check artwork.', 403)

    const data = await this.validate({ decision: 'required|in:approve,reject', note: 'nullable|string|max:500' })

    await booking.reviewArtwork(this.user, data.decision === 'approve', data.note ? String(data.note) : null)

    return new BookingResource(booking)
      .withSplit(true)
      .withDetails(this.user)
      .additional({ status: 'success', message: data.decision === 'approve' ? 'Artwork approved. It goes to print next.' : 'Artwork sent back.', code: 200 })
  }

  /** Start paying for held dates on the provider's checkout. */
  async checkout() {
    const booking = await this.booking()

    if (!BookingPolicy.owns(this.user, booking)) throw new RequestException('Only the person who booked can pay for it.', 403)

    const { payment, url } = await new Checkout().start(booking, this.user)

    return new PaymentResource(payment).withCheckout(url).additional({ status: 'success', message: 'Payment started', code: 201 }).response().setStatusCode(201)
  }

  /** Let go of a hold, or cancel a paid booking by the cancellation terms and send the refund. */
  async cancel() {
    const booking = await this.booking()

    if (!BookingPolicy.owns(this.user, booking)) throw new RequestException('Only the person who booked can cancel it.', 403)

    if (booking.status !== Booking.PAID) {
      await booking.cancel()

      return new BookingResource(booking).additional({ status: 'success', message: 'Booking cancelled. The dates are free again.', code: 200 })
    }

    const refund = await Refunds.cancel(booking, this.user)
    const fresh = await Booking.query().findOrFail(booking.id)
    const message = refund ? `Booking cancelled. ${Money.format(refund.amountMinor, refund.currency)} is on its way back to you.` : 'Booking cancelled.'

    return new BookingResource(fresh).withDetails(this.user).additional({ status: 'success', message, code: 200 })
  }

  /** The booking in the address, if the account may see it. */
  private async booking(): Promise<Booking> {
    const booking = await Booking.query().find(String(this.params.booking))

    if (!booking || !(await BookingPolicy.view(this.user, booking))) throw new RequestException('Booking not found.', 404)

    return booking
  }
}
