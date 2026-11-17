import { Migration, SchemaBuilder } from 'arkormx'

/** Each advertiser on a shared booking sends their own design; the print is all of them merged. */
export default class AddDesignsToBookingSharesMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('booking_shares', (table) => {
      table.string('designPath').nullable().map('design_path')
      table.string('designDisk').nullable().map('design_disk')
      table.integer('designWidth').nullable().map('design_width')
      table.integer('designHeight').nullable().map('design_height')
      table.timestamp('designSentAt').nullable().map('design_sent_at')
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('booking_shares', (table) => {
      for (const column of ['designPath', 'designDisk', 'designWidth', 'designHeight', 'designSentAt']) table.dropColumn(column)
    })
  }
}
