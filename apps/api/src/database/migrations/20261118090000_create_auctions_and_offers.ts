import { DB, Migration, SchemaBuilder } from 'arkormx'

/**
 * Owners and scouts open a face's dates to bids; advertisers bid, or make an offer on a
 * fixed-price board. A won bid or accepted offer becomes a booking held while they pay.
 */
export default class CreateAuctionsAndOffersMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('auctions', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('boardId')
        .map('board_id')
        .foreign()
        .references('boards', 'id')
        .onDelete('cascade')
        .as('board')
        .inverseAlias('auctions')
      table
        .uuid('faceId')
        .map('face_id')
        .foreign()
        .references('board_faces', 'id')
        .onDelete('cascade')
        .as('face')
        .inverseAlias('auctions')
      table.date('startsOn').map('starts_on')
      table.date('endsOn').map('ends_on')
      table.integer('periods')
      table.string('ratePeriod').map('rate_period')
      table.string('currency')
      table.bigInteger('reserveMinor').map('reserve_minor')
      table.string('format')
      table.timestamp('closesAt').map('closes_at')
      table.string('status')
      table.uuid('winningBidId').nullable().map('winning_bid_id')
      table.uuid('bookingId').nullable().map('booking_id')
      table.uuid('openedById').nullable().map('opened_by_id')
      table.timestamps()
      table.index(['faceId', 'status'])
      table.index(['status', 'closesAt'])
    })

    schema.createTable('bids', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('auctionId')
        .map('auction_id')
        .foreign()
        .references('auctions', 'id')
        .onDelete('cascade')
        .as('auction')
        .inverseAlias('bids')
      table
        .uuid('bidderId')
        .map('bidder_id')
        .foreign()
        .references('users', 'id')
        .onDelete('cascade')
        .as('bidder')
        .inverseAlias('bids')
      table.bigInteger('amountMinor').map('amount_minor')
      table.string('status')
      table.timestamps()
      table.index(['auctionId', 'amountMinor'])
      table.index(['bidderId', 'createdAt'])
    })

    schema.createTable('offers', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('boardId')
        .map('board_id')
        .foreign()
        .references('boards', 'id')
        .onDelete('cascade')
        .as('board')
        .inverseAlias('offers')
      table
        .uuid('faceId')
        .map('face_id')
        .foreign()
        .references('board_faces', 'id')
        .onDelete('cascade')
        .as('face')
        .inverseAlias('offers')
      table
        .uuid('advertiserId')
        .map('advertiser_id')
        .foreign()
        .references('users', 'id')
        .onDelete('cascade')
        .as('advertiser')
        .inverseAlias('offers')
      table.date('startsOn').map('starts_on')
      table.date('endsOn').map('ends_on')
      table.integer('periods')
      table.string('ratePeriod').map('rate_period')
      table.string('currency')
      table.bigInteger('listMinor').map('list_minor')
      table.bigInteger('amountMinor').map('amount_minor')
      table.bigInteger('counterMinor').nullable().map('counter_minor')
      table.string('note').nullable()
      table.string('status')
      table.timestamp('expiresAt').map('expires_at')
      table.uuid('bookingId').nullable().map('booking_id')
      table.uuid('respondedById').nullable().map('responded_by_id')
      table.timestamp('respondedAt').nullable().map('responded_at')
      table.timestamps()
      table.index(['boardId', 'status'])
      table.index(['advertiserId', 'createdAt'])
    })

    schema.alterTable('bookings', (table) => {
      table.string('source').default('book')
    })
  }

  public async done(direction: 'up' | 'down'): Promise<void> {
    if (direction !== 'up') return

    await DB.raw('create unique index if not exists bids_auction_bidder on bids (auction_id, bidder_id)')
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('bookings', (table) => {
      table.dropColumn('source')
    })
    schema.dropTable('offers')
    schema.dropTable('bids')
    schema.dropTable('auctions')
  }
}
