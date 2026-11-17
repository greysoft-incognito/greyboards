import { Migration, SchemaBuilder } from 'arkormx'

export default class CreateUsersTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('users', (table) => {
      table.id('id', 'uuid').primary()
      table.string('name')
      table.string('email').unique().index()
      table.string('username').nullable().unique()
      table.string('password')
      table.timestamp('emailVerifiedAt').nullable().map('email_verified_at')
      table.string('avatarPath').nullable().map('avatar_path')
      table.string('avatarDisk').nullable().map('avatar_disk')
      table.string('role').default('user')
      table.timestamp('suspendedAt').nullable().map('suspended_at')
      table.timestamps()
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('users')
  }
}
