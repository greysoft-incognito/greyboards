import { DB, Migration, SchemaBuilder } from 'arkormx'

/**
 * Shared (co-op) bookings: several advertisers split one booking's cost, each paying their
 * own share. A payment can cover several shares, such as the organiser covering the rest.
 */
export default class CreateBookingSharesMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('booking_shares', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('bookingId')
        .map('booking_id')
        .foreign()
        .references('bookings', 'id')
        .onDelete('cascade')
        .as('booking')
        .inverseAlias('shares')
      table.uuid('userId').nullable().map('user_id')
      table.integer('position')
      table.bigInteger('amountMinor').map('amount_minor')
      table.string('status')
      table.string('token')
      table.uuid('paymentId').nullable().map('payment_id')
      table.timestamp('paidAt').nullable().map('paid_at')
      table.timestamps()
      table.index(['bookingId', 'position'])
      table.index(['userId', 'createdAt'])
    })

    schema.alterTable('bookings', (table) => {
      table.boolean('shared').default(false)
    })

    schema.alterTable('payments', (table) => {
      table.json('shareIds').nullable().map('share_ids')
    })
  }

  public async done(direction: 'up' | 'down'): Promise<void> {
    if (direction !== 'up') return

    await DB.raw('create unique index if not exists booking_shares_token on booking_shares (token)')
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('payments', (table) => {
      table.dropColumn('shareIds')
    })
    schema.alterTable('bookings', (table) => {
      table.dropColumn('shared')
    })
    schema.dropTable('booking_shares')
  }
}
