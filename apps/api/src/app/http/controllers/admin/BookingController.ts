import { Booking, type BookingStatus } from '@app/models/Booking'
import { BookingCollection } from '@app/http/resources/BookingCollection'
import { BaseController } from '../BaseController'
import { perPage } from '@arkstack/common'

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
}
