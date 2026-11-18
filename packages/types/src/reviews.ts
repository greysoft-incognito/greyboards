import type { ID } from './models'

/** An average out of 5, shown once enough reviews are in. */
export interface RatingSummary {
  average: number | null
  count: number
}

/** `board`: the advertiser rates the board. `advertiser`: the board's side rates the advertiser. */
export type ReviewSubject = 'board' | 'advertiser'

/** An advertiser's review of a board, as anyone sees it. */
export interface PublishedReview {
  id: ID
  rating: number
  body: string | null
  /** The reviewer's first name. */
  author: string | null
  createdAt: string
}

/** A booking's reviews, for the viewer. */
export interface BookingReviews {
  /** The review the viewer writes, or null when they don't write one. */
  subject: ReviewSubject | null
  /** Open now: the ad went up and the window hasn't closed. */
  canWrite: boolean
  mine: { rating: number; body: string | null; updatedAt: string } | null
  /** The advertiser's average, for the board's side. */
  advertiserRating: RatingSummary | null
}

export interface ReviewInput {
  rating: number
  body?: string | null
}
