import { Migration, SchemaBuilder } from 'arkormx'

/** ID checks for scouts and billposters, and a note on boards that may be tagged twice. */
export default class AddPartnerChecksMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('identity_checks', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('userId')
        .map('user_id')
        .unique()
        .foreign()
        .references('users', 'id')
        .onDelete('cascade')
        .as('user')
        .inverseAlias('identityCheck')
      table.string('documentType').map('document_type')
      table.string('documentNumber').map('document_number')
      table.string('fullName').map('full_name')
      table.string('photoPath').map('photo_path')
      table.string('photoDisk').map('photo_disk')
      table.string('status')
      table.string('note').nullable()
      table.uuid('reviewedById').nullable().map('reviewed_by_id')
      table.timestamp('reviewedAt').nullable().map('reviewed_at')
      table.timestamps()
    })

    schema.alterTable('boards', (table) => {
      table.uuid('duplicateOfId').nullable().map('duplicate_of_id')
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('boards', (table) => {
      table.dropColumn('duplicateOfId')
    })
    schema.dropTable('identity_checks')
  }
}
