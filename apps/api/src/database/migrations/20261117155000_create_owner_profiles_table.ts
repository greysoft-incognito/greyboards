import { DB, Migration, SchemaBuilder } from 'arkormx'

/**
 * A board owner as Greyboards knows them, whether or not they have an account. Scouts
 * make one the first time they tag an owner's board; the owner claims it later by
 * proving the phone number. One account can manage several, such as an agency's clients.
 */
export default class CreateOwnerProfilesTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('owner_profiles', (table) => {
      table.id('id', 'uuid').primary()
      table.string('name')
      table.string('phone').nullable()
      table
        .uuid('userId')
        .nullable()
        .map('user_id')
        .foreign()
        .references('users', 'id')
        .onDelete('setNull')
        .as('user')
        .inverseAlias('ownerProfiles')
      table
        .uuid('createdById')
        .nullable()
        .map('created_by_id')
        .foreign()
        .references('users', 'id')
        .onDelete('setNull')
        .as('creator')
        .inverseAlias('createdOwnerProfiles')
      table.timestamp('claimedAt').nullable().map('claimed_at')
      table.timestamp('phoneVerifiedAt').nullable().map('phone_verified_at')
      table.timestamps()
      table.index(['userId'])
    })
  }

  /** One profile per phone number, and a fast case-blind name search for suggestions. */
  public async done(direction: 'up' | 'down'): Promise<void> {
    if (direction !== 'up') return

    await DB.raw('create unique index if not exists owner_profiles_phone_unique on owner_profiles (phone) where phone is not null')
    await DB.raw('create index if not exists owner_profiles_name_lower on owner_profiles (lower(name) text_pattern_ops)')
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('owner_profiles')
  }
}
