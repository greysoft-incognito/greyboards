import { Migration, SchemaBuilder } from 'arkormx'

export default class CreatePaymentsTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('payments', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('userId')
        .map('user_id')
        .foreign()
        .references('users', 'id')
        .onDelete('restrict')
        .as('user')
        .inverseAlias('payments')
      table
        .uuid('bookingId')
        .map('booking_id')
        .foreign()
        .references('bookings', 'id')
        .onDelete('restrict')
        .as('booking')
        .inverseAlias('payments')
      table.string('reference').unique()
      table.string('provider')
      table.string('status')
      table.bigInteger('amountMinor').map('amount_minor')
      table.string('currency')
      table.json('response').nullable()
      table.timestamp('paidAt').nullable().map('paid_at')
      table.timestamps()
      table.index(['bookingId'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('payments')
  }
}
