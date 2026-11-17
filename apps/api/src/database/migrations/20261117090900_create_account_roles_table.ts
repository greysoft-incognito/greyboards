import { Migration, SchemaBuilder } from 'arkormx'

export default class CreateAccountRolesTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('account_roles', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('userId')
        .map('user_id')
        .foreign()
        .references('users', 'id')
        .onDelete('cascade')
        .as('user')
        .inverseAlias('accountRoles')
      table.string('kind')
      table.string('status')
      table.string('note').nullable()
      table
        .uuid('reviewedById')
        .nullable()
        .map('reviewed_by_id')
        .foreign()
        .references('users', 'id')
        .onDelete('setNull')
        .as('reviewer')
        .inverseAlias('reviewedAccountRoles')
      table.timestamp('reviewedAt').nullable().map('reviewed_at')
      table.timestamps()
      table.unique(['userId', 'kind'])
      table.index(['kind', 'status'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('account_roles')
  }
}
