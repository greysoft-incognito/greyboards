import { Migration, SchemaBuilder } from 'arkormx'

/** Each agreement keeps the wording its owner was sent, so later edits to the wording don't change what they read and sign. */
export default class AddTermsToBoardAgreementsMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('board_agreements', (table) => {
      table.json('terms').nullable()
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('board_agreements', (table) => {
      table.dropColumn('terms')
    })
  }
}
