import { DB, Migration, SchemaBuilder } from 'arkormx'

/**
 * Messages about a booking between the advertiser, whoever looks after the board and the
 * billposter, kept with the booking. Each reader's last visit gives their unread count.
 */
export default class CreateBookingMessagesMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('booking_messages', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('bookingId')
        .map('booking_id')
        .foreign()
        .references('bookings', 'id')
        .onDelete('cascade')
        .as('booking')
        .inverseAlias('messages')
      table.uuid('authorId').nullable().map('author_id')
      table.text('body').nullable()
      table.string('photoPath').nullable().map('photo_path')
      table.string('photoDisk').nullable().map('photo_disk')
      table.integer('photoWidth').nullable().map('photo_width')
      table.integer('photoHeight').nullable().map('photo_height')
      table.timestamps()
      table.index(['bookingId', 'createdAt'])
    })

    schema.createTable('booking_message_reads', (table) => {
      table.id('id', 'uuid').primary()
      table.uuid('bookingId').map('booking_id')
      table.uuid('userId').map('user_id')
      table.timestamp('readAt').map('read_at')
      table.timestamps()
    })
  }

  public async done(direction: 'up' | 'down'): Promise<void> {
    if (direction !== 'up') return

    await DB.raw('create unique index if not exists booking_message_reads_booking_user on booking_message_reads (booking_id, user_id)')
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('booking_message_reads')
    schema.dropTable('booking_messages')
  }
}
