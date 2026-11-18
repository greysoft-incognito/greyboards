import { Model } from '@arkstack/database'
import type { QueryBuilder } from 'arkormx'
import { User } from './User'

/** `board`: the advertiser rated the board and whoever looks after it. `advertiser`: the board's side rated the advertiser. */
export type ReviewSubject = 'board' | 'advertiser'

/** A 1 to 5 star rating after a campaign, with an optional note. One per booking for each side. */
export class Review extends Model {
  declare id: string
  declare bookingId: string
  declare authorId: string
  declare subject: ReviewSubject
  declare boardId: string
  declare advertiserId: string | null
  declare rating: number
  declare body: string | null
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'reviews'

  protected static override columns = {
    bookingId: 'booking_id',
    authorId: 'author_id',
    boardId: 'board_id',
    advertiserId: 'advertiser_id',
  }

  protected override casts = {
    rating: 'number',
  } as never

  author() {
    return this.belongsTo(User, 'authorId')
  }

  /** Reviews of a board, newest first. */
  scopeOfBoard(query: QueryBuilder<Review>, boardId: string): QueryBuilder<Review> {
    return query.where({ boardId, subject: 'board' })
  }
}
