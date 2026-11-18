import { Migration, SchemaBuilder } from 'arkormx'

/**
 * How busy a board's road is: the kind of road its tagger picked, and a measured count of
 * people passing each day when someone has one. Traffic estimates and price guidance use them.
 */
export default class AddTrafficToBoardsMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('boards', (table) => {
      table.string('roadClass').nullable().map('road_class')
      table.integer('dailyTraffic').nullable().map('daily_traffic')
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('boards', (table) => {
      table.dropColumn('roadClass')
      table.dropColumn('dailyTraffic')
    })
  }
}
