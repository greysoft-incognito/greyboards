import { Migration, SchemaBuilder } from 'arkormx'

export default class CreateLedgerEntriesTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('ledger_entries', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('bookingId')
        .map('booking_id')
        .foreign()
        .references('bookings', 'id')
        .onDelete('restrict')
        .as('booking')
        .inverseAlias('ledgerEntries')
      table.string('account')
      table.string('kind')
      table.bigInteger('amountMinor').map('amount_minor')
      table.string('currency')
      table.uuid('userId').nullable().map('user_id')
      table.uuid('ownerProfileId').nullable().map('owner_profile_id')
      table.string('reference').nullable()
      table.string('memo').nullable()
      table.timestamps()
      table.index(['bookingId', 'createdAt'])
      table.index(['account', 'createdAt'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('ledger_entries')
  }
}
