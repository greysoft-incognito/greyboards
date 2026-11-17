import { Migration, SchemaBuilder } from 'arkormx'

/**
 * The scout pipeline: boards a scout spotted and is working on, from first sighting to
 * earning, and territories staff hand scouts so two don't chase the same owner.
 */
export default class CreateProspectsAndTerritoriesMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('prospects', (table) => {
      table.id('id', 'uuid').primary()
      table.uuid('scoutId').map('scout_id')
      table.string('name')
      table.float('latitude')
      table.float('longitude')
      table.string('address').nullable()
      table.string('ownerName').nullable().map('owner_name')
      table.string('ownerPhone').nullable().map('owner_phone')
      table.text('notes').nullable()
      table.string('stage').default('prospect')
      table.uuid('boardId').nullable().map('board_id')
      table.timestamp('stageChangedAt').nullable().map('stage_changed_at')
      table.timestamps()
      table.index(['scoutId', 'updatedAt'])
      table.index(['ownerPhone'])
      table.index(['boardId'])
    })

    schema.createTable('territories', (table) => {
      table.id('id', 'uuid').primary()
      table.string('name')
      table.uuid('scoutId').nullable().map('scout_id')
      table.float('latitude')
      table.float('longitude')
      table.integer('radiusM').map('radius_m')
      table.timestamps()
      table.index(['scoutId'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('territories')
    schema.dropTable('prospects')
  }
}
