import { Migration, SchemaBuilder } from 'arkormx'

export default class CreatePrintJobsTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('print_jobs', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('bookingId')
        .unique()
        .map('booking_id')
        .foreign()
        .references('bookings', 'id')
        .onDelete('restrict')
        .as('booking')
        .inverseAlias('printJob')
      table
        .uuid('boardId')
        .map('board_id')
        .foreign()
        .references('boards', 'id')
        .onDelete('restrict')
        .as('board')
        .inverseAlias('printJobs')
      table
        .uuid('billposterId')
        .nullable()
        .map('billposter_id')
        .foreign()
        .references('users', 'id')
        .onDelete('setNull')
        .as('billposter')
        .inverseAlias('printJobs')
      table.string('status')
      table.bigInteger('feeMinor').map('fee_minor')
      table.string('currency')
      table.date('dueOn').map('due_on')
      table.timestamp('reservedUntil').nullable().map('reserved_until')
      table.timestamp('confirmedAt').nullable().map('confirmed_at')
      table.string('printPhotoPath').nullable().map('print_photo_path')
      table.string('printPhotoDisk').nullable().map('print_photo_disk')
      table.timestamp('printedAt').nullable().map('printed_at')
      table.timestamp('postedAt').nullable().map('posted_at')
      table.timestamps()
      table.index(['status', 'dueOn'])
      table.index(['billposterId', 'status'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('print_jobs')
  }
}
