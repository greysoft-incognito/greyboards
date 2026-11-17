import { Migration, SchemaBuilder } from 'arkormx'

export default class CreateBoardAgreementsTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('board_agreements', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('boardId')
        .map('board_id')
        .foreign()
        .references('boards', 'id')
        .onDelete('cascade')
        .as('board')
        .inverseAlias('agreements')
      table
        .uuid('ownerProfileId')
        .map('owner_profile_id')
        .foreign()
        .references('owner_profiles', 'id')
        .onDelete('cascade')
        .as('ownerProfile')
        .inverseAlias('agreements')
      table
        .uuid('sentById')
        .nullable()
        .map('sent_by_id')
        .foreign()
        .references('users', 'id')
        .onDelete('setNull')
        .as('sender')
        .inverseAlias('sentAgreements')
      table.string('ownerName').nullable().map('owner_name')
      table.string('ownerPhone').map('owner_phone')
      table.integer('ownerSharePercent').map('owner_share_percent')
      table.bigInteger('rateMinor').nullable().map('rate_minor')
      table.string('currency').default('NGN')
      table.string('ratePeriod').default('month').map('rate_period')
      table.string('status')
      table.string('tokenHash').unique().map('token_hash')
      table.timestamp('expiresAt').map('expires_at')
      table.integer('sendCount').default(1).map('send_count')
      table.timestamp('lastSentAt').map('last_sent_at')
      table.string('signedName').nullable().map('signed_name')
      table.timestamp('signedAt').nullable().map('signed_at')
      table.string('signedIp').nullable().map('signed_ip')
      table.string('signedUserAgent').nullable().map('signed_user_agent')
      table.timestamp('declinedAt').nullable().map('declined_at')
      table.timestamps()
      table.index(['boardId', 'status'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('board_agreements')
  }
}
