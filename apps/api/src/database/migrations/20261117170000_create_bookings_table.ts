import { DB, Migration, SchemaBuilder } from 'arkormx'

export default class CreateBookingsTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('bookings', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('boardId')
        .map('board_id')
        .foreign()
        .references('boards', 'id')
        .onDelete('restrict')
        .as('board')
        .inverseAlias('bookings')
      table
        .uuid('advertiserId')
        .map('advertiser_id')
        .foreign()
        .references('users', 'id')
        .onDelete('restrict')
        .as('advertiser')
        .inverseAlias('bookings')
      table.date('startsOn').map('starts_on')
      table.date('endsOn').map('ends_on')
      table.integer('periods')
      table.string('ratePeriod').map('rate_period')
      table.bigInteger('rateMinor').map('rate_minor')
      table.bigInteger('amountMinor').map('amount_minor')
      table.string('currency')
      table.string('status')
      table.timestamp('holdExpiresAt').nullable().map('hold_expires_at')
      table.integer('ownerSharePercent').nullable().map('owner_share_percent')
      table.bigInteger('ownerAmountMinor').nullable().map('owner_amount_minor')
      table.bigInteger('scoutAmountMinor').nullable().map('scout_amount_minor')
      table.bigInteger('platformAmountMinor').nullable().map('platform_amount_minor')
      table.uuid('scoutId').nullable().map('scout_id')
      table.uuid('ownerProfileId').nullable().map('owner_profile_id')
      table.timestamp('paidAt').nullable().map('paid_at')
      table.timestamp('cancelledAt').nullable().map('cancelled_at')
      table.timestamps()
      table.index(['advertiserId', 'createdAt'])
      table.index(['boardId', 'startsOn'])
    })
  }

  /** No two live bookings may share a day on the same board, even if two checkouts race. */
  public async done(direction: 'up' | 'down'): Promise<void> {
    if (direction !== 'up') return

    await DB.raw('create extension if not exists btree_gist')
    await DB.raw(
      `alter table bookings add constraint bookings_no_overlap exclude using gist (board_id with =, daterange(starts_on, ends_on, '[]') with &&) where (status in ('held', 'paid', 'live'))`,
    )
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('bookings')
  }
}
