import { Migration, SchemaBuilder } from 'arkormx'

export default class AddHeadingToBoardsMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('boards', (table) => {
      table.integer('headingDeg').nullable().map('heading_deg')
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('boards', (table) => {
      table.dropColumn('headingDeg')
    })
  }
}
