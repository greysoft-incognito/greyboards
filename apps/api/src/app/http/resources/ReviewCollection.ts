import type { Review } from '@app/models/Review'
import { User } from '@app/models/User'
import { Collection } from './Collection'

/** A page of a board's reviews, each with its author's first name, loaded in one query. */
export class ReviewCollection extends Collection {
  data() {
    const reviews = this.items() as Review[]
    const names = ReviewCollection.firstNames(reviews)

    return reviews.map(async (review) => ({
      id: review.id,
      rating: review.rating,
      body: review.body,
      author: (await names).get(review.authorId) ?? null,
      createdAt: review.createdAt,
    })) as never
  }

  private static async firstNames(reviews: Review[]): Promise<Map<string, string>> {
    const ids = [...new Set(reviews.map((review) => review.authorId))]
    const authors = ids.length ? (await User.query().whereIn('id', ids).get()).all() : []

    return new Map(authors.map((author) => [author.id, author.name.split(' ')[0]!]))
  }
}
