import { DB, Migration, SchemaBuilder } from 'arkormx'

/**
 * Keys agencies use to reach the public API from their own systems. Only a hash is kept;
 * the key shows once when it is made. Each key can read, or read and book.
 */
export default class CreateApiKeysMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('api_keys', (table) => {
      table.id('id', 'uuid').primary()
      table.uuid('userId').map('user_id')
      table.string('name')
      table.string('prefix')
      table.string('tokenHash').map('token_hash')
      table.json('abilities')
      table.timestamp('lastUsedAt').nullable().map('last_used_at')
      table.timestamp('revokedAt').nullable().map('revoked_at')
      table.timestamps()
      table.index(['userId'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('api_keys')
  }

  public async done(direction: 'up' | 'down'): Promise<void> {
    if (direction === 'up') await DB.raw('create unique index if not exists api_keys_token on api_keys (token_hash)')
  }
}
