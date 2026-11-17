import { Migration, SchemaBuilder } from 'arkormx'

export default class CreatePostingProofsTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('posting_proofs', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('bookingId')
        .map('booking_id')
        .foreign()
        .references('bookings', 'id')
        .onDelete('restrict')
        .as('booking')
        .inverseAlias('postingProofs')
      table
        .uuid('uploadedById')
        .nullable()
        .map('uploaded_by_id')
        .foreign()
        .references('users', 'id')
        .onDelete('setNull')
        .as('uploadedBy')
        .inverseAlias('postingProofs')
      table.string('path')
      table.string('disk')
      table.integer('width')
      table.integer('height')
      table.float('latitude')
      table.float('longitude')
      table.float('accuracyM').nullable().map('accuracy_m')
      table.integer('distanceM').map('distance_m')
      table.timestamp('takenAt').nullable().map('taken_at')
      table.timestamps()
      table.index(['bookingId'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('posting_proofs')
  }
}
