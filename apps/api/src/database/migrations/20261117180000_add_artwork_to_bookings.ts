import { Migration, SchemaBuilder } from 'arkormx'

export default class AddArtworkToBookingsMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('bookings', (table) => {
      table.bigInteger('printFeeMinor').default(0).map('print_fee_minor')
      table.string('artworkPath').nullable().map('artwork_path')
      table.string('artworkDisk').nullable().map('artwork_disk')
      table.integer('artworkWidth').nullable().map('artwork_width')
      table.integer('artworkHeight').nullable().map('artwork_height')
      table.string('artworkStatus').default('none').map('artwork_status')
      table.string('artworkNote').nullable().map('artwork_note')
      table.uuid('artworkReviewedById').nullable().map('artwork_reviewed_by_id')
      table.timestamp('artworkReviewedAt').nullable().map('artwork_reviewed_at')
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('bookings', (table) => {
      for (const column of ['printFeeMinor', 'artworkPath', 'artworkDisk', 'artworkWidth', 'artworkHeight', 'artworkStatus', 'artworkNote', 'artworkReviewedById', 'artworkReviewedAt']) {
        table.dropColumn(column)
      }
    })
  }
}
