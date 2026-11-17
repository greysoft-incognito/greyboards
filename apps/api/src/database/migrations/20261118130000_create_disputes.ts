import { DB, Migration, SchemaBuilder } from 'arkormx'

/**
 * When something goes wrong with a booking, anyone on it can raise a dispute. Staff decide
 * it, and the decision moves the money held in escrow.
 */
export default class CreateDisputesMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('disputes', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('bookingId')
        .map('booking_id')
        .foreign()
        .references('bookings', 'id')
        .onDelete('cascade')
        .as('booking')
        .inverseAlias('disputes')
      table.uuid('openedById').map('opened_by_id')
      table.string('side')
      table.string('reason')
      table.text('details')
      table.string('status').default('open')
      table.string('decision').nullable()
      table.integer('refundMinor').nullable().map('refund_minor')
      table.text('resolution').nullable()
      table.uuid('resolvedById').nullable().map('resolved_by_id')
      table.timestamp('resolvedAt').nullable().map('resolved_at')
      table.timestamps()
      table.index(['status', 'createdAt'])
      table.index(['bookingId', 'createdAt'])
    })
  }

  /** One open dispute per booking. */
  public async done(direction: 'up' | 'down'): Promise<void> {
    if (direction !== 'up') return

    await DB.raw("create unique index if not exists disputes_one_open on disputes (booking_id) where status = 'open'")
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('disputes')
  }
}
