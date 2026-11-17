import { DB, Migration, SchemaBuilder } from 'arkormx'

/** Boards point at an owner profile instead of holding the owner's account, name and phone. */
export default class LinkBoardsToOwnerProfilesMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('boards', (table) => {
      table
        .uuid('ownerProfileId')
        .nullable()
        .map('owner_profile_id')
        .foreign()
        .references('owner_profiles', 'id')
        .onDelete('setNull')
        .as('ownerProfile')
        .inverseAlias('boards')
      table.index(['ownerProfileId'])
    })
  }

  /** Give every owner already on a board a profile: accounts get their own, phone numbers one each. */
  public async done(direction: 'up' | 'down'): Promise<void> {
    if (direction !== 'up') return

    await DB.raw(
      `insert into owner_profiles (id, name, user_id, created_by_id, claimed_at, "createdAt", "updatedAt")
        select gen_random_uuid(), u.name, u.id, u.id, now(), now(), now() from users u
        where u.id in (select distinct owner_id from boards where owner_id is not null)
          and not exists (select 1 from owner_profiles p where p.user_id = u.id)`,
    )
    await DB.raw(`update boards b set owner_profile_id = p.id from owner_profiles p where b.owner_id is not null and p.user_id = b.owner_id and b.owner_profile_id is null`)
    await DB.raw(
      `insert into owner_profiles (id, name, phone, created_by_id, "createdAt", "updatedAt")
        select distinct on (owner_phone) gen_random_uuid(), coalesce(owner_name, 'Board owner'), owner_phone, tagged_by_id, now(), now()
        from boards where owner_id is null and owner_phone is not null
          and not exists (select 1 from owner_profiles p where p.phone = boards.owner_phone)
        order by owner_phone, "createdAt"`,
    )
    await DB.raw(`update boards b set owner_profile_id = p.id from owner_profiles p where b.owner_id is null and p.phone = b.owner_phone and b.owner_profile_id is null`)
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('boards', (table) => {
      table.dropColumn('owner_profile_id')
    })
  }
}
