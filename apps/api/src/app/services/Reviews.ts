import { abortIf } from '@arkstack/common'
import { DB } from 'arkormx'
import { Board } from '@app/models/Board'
import { Booking } from '@app/models/Booking'
import { Review, type ReviewSubject } from '@app/models/Review'
import type { User } from '@app/models/User'
import { BoardPolicy } from '@app/policies/BoardPolicy'
import { Day } from '@app/support/Day'
import { Settings } from '@app/support/Settings'

/** An average shown once enough reviews are in. */
export interface RatingSummary {
  average: number | null
  count: number
}

/**
 * Reviews after a campaign. Once the ad is up, the advertiser rates the board and the
 * board's side rates the advertiser, each once per booking, and can change it until the
 * window closes. Boards and accounts keep running totals, so averages cost no queries.
 */
export class Reviews {
  /** Which review `user` writes for a booking, or null when they don't write one. */
  static async subjectFor(booking: Booking, user: User): Promise<ReviewSubject | null> {
    if (user.id === booking.advertiserId) return 'board'

    const board = await Board.query().find(booking.boardId)

    return board && (await BoardPolicy.manages(user, board)) ? 'advertiser' : null
  }

  /** Whether reviews are on and this booking's are open: its ad went up, and the window after its last day hasn't closed. */
  static async open(booking: Booking): Promise<boolean> {
    if (!(await Settings.get('reviews.enabled'))) return false
    if (![Booking.LIVE, Booking.COMPLETED].includes(booking.status)) return false

    return Day.today() <= Day.addDays(Day.of(booking.endsOn), await Settings.number('reviews.window_days'))
  }

  /** Write or change `author`'s review of the booking. */
  static async write(booking: Booking, author: User, rating: number, body: string | null): Promise<Review> {
    const subject = await Reviews.subjectFor(booking, author)

    abortIf(!subject, 'Only the advertiser and the board owner can review a booking.', 403)
    abortIf(!(await Reviews.open(booking)), 'You can leave a review once the ad is up, until a little after the booking ends.', 422)
    abortIf(!Number.isInteger(rating) || rating < 1 || rating > 5, 'Choose 1 to 5 stars.', 422)

    const existing = await Review.query().where({ bookingId: booking.id, subject: subject! }).first()
    const text = body?.trim() || null

    if (existing) {
      await Reviews.tally(existing, rating - existing.rating, 0)
      await existing.update({ rating, body: text, authorId: author.id })

      return existing
    }

    const review = await Review.query().create({
      bookingId: booking.id,
      authorId: author.id,
      subject: subject!,
      boardId: booking.boardId,
      advertiserId: subject === 'advertiser' ? booking.advertiserId : null,
      rating,
      body: text,
    })

    await Reviews.tally(review, rating, 1)

    return review
  }

  /** A board's or advertiser's average, once enough reviews are in. */
  static async summary(sum: number, count: number): Promise<RatingSummary> {
    const shown = count >= (await Settings.number('reviews.min_to_show'))

    return { average: shown && count ? Math.round((Number(sum) / Number(count)) * 10) / 10 : null, count: Number(count) }
  }

  /** Move a review's running totals on its board or advertiser. */
  private static async tally(review: Review, sum: number, count: number): Promise<void> {
    if (review.subject === 'board') {
      await DB.raw('update boards set rating_sum = rating_sum + ?, rating_count = rating_count + ? where id = ?', [sum, count, review.boardId])
    } else {
      await DB.raw('update users set advertiser_rating_sum = advertiser_rating_sum + ?, advertiser_rating_count = advertiser_rating_count + ? where id = ?', [sum, count, review.advertiserId])
    }
  }
}
