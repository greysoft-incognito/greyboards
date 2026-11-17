import { Booking, type BookingStatus } from '@app/models/Booking'
import { BookingCollection } from '@app/http/resources/BookingCollection'
import { BaseController } from '../BaseController'
import { BookingResource } from '@app/http/resources/BookingResource'
import { Refunds } from '@app/services/Refunds'
import { RequestException, perPage } from '@arkstack/common'

const STATUSES: BookingStatus[] = ['held', 'paid', 'live', 'completed', 'cancelled', 'expired']

/** Every booking, for staff who follow payments and escrow. */
export default class BookingController extends BaseController {
  async index() {
    const filters = await this.validateQuery({ status: `nullable|in:${STATUSES.join(',')}` })
    const query = Booking.query()

    if (filters.status) query.where({ status: filters.status as BookingStatus })

    const bookings = await query.latest('createdAt').paginate(perPage(this.query, { perPage: 25, maxPerPage: 100 }))

    return new BookingCollection(bookings).withSplit(true).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** Cancel a paid booking whose money is still held, and give it all back. */
  async refund() {
    const booking = await Booking.query().find(String(this.params.booking))

    if (!booking) throw new RequestException('Booking not found.', 404)

    const data = await this.validate({ reason: 'required|string|min:5|max:191' })

    await Refunds.refundInFull(booking, this.user, String(data.reason))

    const fresh = await Booking.query().findOrFail(booking.id)

    return new BookingResource(fresh).withDetails(this.user).withSplit(true).additional({ status: 'success', message: 'Booking cancelled and refunded in full.', code: 200 })
  }
}
