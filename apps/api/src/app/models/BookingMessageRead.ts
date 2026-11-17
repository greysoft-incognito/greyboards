import { Model } from '@arkstack/database'

/** When someone last read a booking's messages. */
export class BookingMessageRead extends Model {
  declare id: string
  declare bookingId: string
  declare userId: string
  declare readAt: Date
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'booking_message_reads'

  protected static override columns = {
    bookingId: 'booking_id',
    userId: 'user_id',
    readAt: 'read_at',
  }
}
