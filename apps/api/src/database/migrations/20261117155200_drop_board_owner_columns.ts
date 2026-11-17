import { Migration, SchemaBuilder } from 'arkormx'

/** The owner's account, name and phone now live on their owner profile. */
export default class DropBoardOwnerColumnsMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('boards', (table) => {
      table.dropColumn('owner_id')
      table.dropColumn('owner_name')
      table.dropColumn('owner_phone')
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('boards', (table) => {
      table.string('ownerName').nullable().map('owner_name')
      table.string('ownerPhone').nullable().map('owner_phone')
      table.uuid('ownerId').nullable().map('owner_id')
    })
  }
}
