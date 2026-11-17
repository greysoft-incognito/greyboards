import { Migration, SchemaBuilder } from 'arkormx'

export default class CreateRefundsTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('refunds', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('bookingId')
        .map('booking_id')
        .foreign()
        .references('bookings', 'id')
        .onDelete('restrict')
        .as('booking')
        .inverseAlias('refunds')
      table
        .uuid('paymentId')
        .map('payment_id')
        .foreign()
        .references('payments', 'id')
        .onDelete('restrict')
        .as('payment')
        .inverseAlias('refunds')
      table.bigInteger('amountMinor').map('amount_minor')
      table.string('currency')
      table.string('reason')
      table.string('status')
      table.string('failureReason').nullable().map('failure_reason')
      table.string('providerRefundId').nullable().map('provider_refund_id')
      table.json('response').nullable()
      table.uuid('requestedById').nullable().map('requested_by_id')
      table.timestamp('refundedAt').nullable().map('refunded_at')
      table.timestamps()
      table.index(['status', 'createdAt'])
      table.index(['bookingId'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('refunds')
  }
}
