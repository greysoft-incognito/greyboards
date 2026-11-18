import { Board } from '@app/models/Board'
import { Booking } from '@app/models/Booking'
import { Review } from '@app/models/Review'
import { ReviewCollection } from '@app/http/resources/ReviewCollection'
import { BookingPolicy } from '@app/policies/BookingPolicy'
import { BoardPolicy } from '@app/policies/BoardPolicy'
import { Reviews } from '@app/services/Reviews'
import { BaseController } from './BaseController'
import { GenericResource } from 'resora'
import { RequestException, perPage } from '@arkstack/common'

/** Reviews after a campaign: advertisers rate boards, and the board's side rates advertisers. */
export default class ReviewController extends BaseController {
  /** A board's reviews, newest first, with the first name of whoever wrote each, and its average. Works signed out. */
  async index() {
    const board = await Board.query().findOrFail(String(this.params.board))

    if (!(await BoardPolicy.view(await this.viewer(), board))) throw new RequestException('Board not found.', 404)

    const reviews = await Review.scope('ofBoard', board.id).latest('createdAt').paginate(perPage(this.query, { perPage: 10, maxPerPage: 50 }))

    return new ReviewCollection(reviews).additional({ summary: await Reviews.summary(board.ratingSum ?? 0, board.ratingCount ?? 0), status: 'success', message: 'OK', code: 200 })
  }

  /** Write or change the viewer's review of a booking. */
  async store() {
    const booking = await Booking.query().find(String(this.params.booking))

    if (!booking || !(await BookingPolicy.view(this.user, booking))) throw new RequestException('Booking not found.', 404)

    const data = await this.validate({ rating: 'required|integer|min:1|max:5', body: 'nullable|string|max:1000' })
    const review = await Reviews.write(booking, this.user, Number(data.rating), data.body ? String(data.body) : null)

    return new GenericResource({ id: review.id, subject: review.subject, rating: review.rating, body: review.body, updatedAt: review.updatedAt }).additional({
      status: 'success',
      message: 'Thanks for your review.',
      code: 200,
    })
  }
}
