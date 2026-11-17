import { Migration, SchemaBuilder } from 'arkormx'

export default class AddOwnerPrintingMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('boards', (table) => {
      table.boolean('printsOwn').default(false).map('prints_own')
      table.bigInteger('printFeeMinor').nullable().map('print_fee_minor')
    })

    schema.alterTable('bookings', (table) => {
      table.string('printedBy').default('billposter').map('printed_by')
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('boards', (table) => {
      table.dropColumn('printsOwn')
      table.dropColumn('printFeeMinor')
    })

    schema.alterTable('bookings', (table) => {
      table.dropColumn('printedBy')
    })
  }
}
