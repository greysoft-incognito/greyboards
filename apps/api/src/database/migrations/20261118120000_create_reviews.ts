import { DB, Migration, SchemaBuilder } from 'arkormx'

/**
 * After a campaign, advertisers rate the board and whoever looks after it, and the board's
 * side rates the advertiser. Boards and accounts keep running totals for their averages.
 */
export default class CreateReviewsMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('reviews', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('bookingId')
        .map('booking_id')
        .foreign()
        .references('bookings', 'id')
        .onDelete('cascade')
        .as('booking')
        .inverseAlias('reviews')
      table.uuid('authorId').map('author_id')
      table.string('subject')
      table.uuid('boardId').map('board_id')
      table.uuid('advertiserId').nullable().map('advertiser_id')
      table.integer('rating')
      table.text('body').nullable()
      table.timestamps()
      table.index(['boardId', 'createdAt'])
      table.index(['advertiserId', 'createdAt'])
    })

    schema.alterTable('boards', (table) => {
      table.integer('ratingSum').default(0).map('rating_sum')
      table.integer('ratingCount').default(0).map('rating_count')
    })

    schema.alterTable('users', (table) => {
      table.integer('advertiserRatingSum').default(0).map('advertiser_rating_sum')
      table.integer('advertiserRatingCount').default(0).map('advertiser_rating_count')
    })
  }

  public async done(direction: 'up' | 'down'): Promise<void> {
    if (direction !== 'up') return

    await DB.raw('create unique index if not exists reviews_booking_subject on reviews (booking_id, subject)')
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('users', (table) => {
      table.dropColumn('advertiserRatingSum')
      table.dropColumn('advertiserRatingCount')
    })
    schema.alterTable('boards', (table) => {
      table.dropColumn('ratingSum')
      table.dropColumn('ratingCount')
    })
    schema.dropTable('reviews')
  }
}
