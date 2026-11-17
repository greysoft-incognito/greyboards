import { Migration, SchemaBuilder } from 'arkormx'

export default class CreatePayoutTablesMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('payout_accounts', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('userId')
        .nullable()
        .unique()
        .map('user_id')
        .foreign()
        .references('users', 'id')
        .onDelete('cascade')
        .as('user')
        .inverseAlias('payoutAccount')
      table
        .uuid('ownerProfileId')
        .nullable()
        .unique()
        .map('owner_profile_id')
        .foreign()
        .references('owner_profiles', 'id')
        .onDelete('cascade')
        .as('ownerProfile')
        .inverseAlias('payoutAccount')
      table.string('bankCode').map('bank_code')
      table.string('bankName').map('bank_name')
      table.string('accountNumber').map('account_number')
      table.string('accountName').map('account_name')
      table.string('currency')
      table.uuid('updatedById').nullable().map('updated_by_id')
      table.timestamps()
    })

    schema.createTable('payouts', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('ledgerEntryId')
        .unique()
        .map('ledger_entry_id')
        .foreign()
        .references('ledger_entries', 'id')
        .onDelete('restrict')
        .as('ledgerEntry')
        .inverseAlias('payout')
      table.uuid('bookingId').map('booking_id')
      table.string('account')
      table.uuid('userId').nullable().map('user_id')
      table.uuid('ownerProfileId').nullable().map('owner_profile_id')
      table.bigInteger('amountMinor').map('amount_minor')
      table.string('currency')
      table.string('bankCode').map('bank_code')
      table.string('bankName').map('bank_name')
      table.string('accountNumber').map('account_number')
      table.string('accountName').map('account_name')
      table.string('reference').unique()
      table.string('provider')
      table.string('status')
      table.string('failureReason').nullable().map('failure_reason')
      table.json('response').nullable()
      table.timestamp('paidAt').nullable().map('paid_at')
      table.timestamps()
      table.index(['status', 'createdAt'])
      table.index(['userId', 'createdAt'])
      table.index(['ownerProfileId', 'createdAt'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('payouts')
    schema.dropTable('payout_accounts')
  }
}
