import { Migration, SchemaBuilder } from 'arkormx'

/** A payment can take a whole shared board over once its lock ends. */
export default class AddTakeoverToPaymentsMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('payments', (table) => {
      table.boolean('takeover').default(false)
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('payments', (table) => {
      table.dropColumn('takeover')
    })
  }
}
