import { Migration, SchemaBuilder } from 'arkormx'

/**
 * Whoever tags a board can fix what its owner receives. The rate they enter is then the owner's
 * amount, kept in `owner_rate_minor`, and the listed rate adds the other shares on top.
 */
export default class AddOwnerNetToBoardsMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('boards', (table) => {
      table.boolean('ownerNet').default(false).map('owner_net')
      table.bigInteger('ownerRateMinor').nullable().map('owner_rate_minor')
    })
    schema.alterTable('board_faces', (table) => {
      table.bigInteger('ownerRateMinor').nullable().map('owner_rate_minor')
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('boards', (table) => {
      table.dropColumn('owner_net')
      table.dropColumn('owner_rate_minor')
    })
    schema.alterTable('board_faces', (table) => {
      table.dropColumn('owner_rate_minor')
    })
  }
}
