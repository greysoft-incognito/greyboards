import { Model } from '@arkstack/database'
import { User } from './User'

/**
 * `open` until someone takes it from the invite link, `claimed` once they have, `paid`
 * once their money is in escrow, `refunded` when the booking didn't go ahead.
 */
export type ShareStatus = 'open' | 'claimed' | 'paid' | 'refunded'

/** One advertiser's part of a shared booking's cost. The organiser holds the first. */
export class BookingShare extends Model {
  declare id: string
  declare bookingId: string
  declare userId: string | null
  declare position: number
  declare amountMinor: number
  declare status: ShareStatus
  declare token: string
  declare paymentId: string | null
  declare paidAt: Date | null
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'booking_shares'

  protected static override columns = {
    bookingId: 'booking_id',
    userId: 'user_id',
    amountMinor: 'amount_minor',
    paymentId: 'payment_id',
    paidAt: 'paid_at',
  }

  protected override casts = {
    amountMinor: 'number',
    paidAt: 'datetime',
  } as never

  user() {
    return this.belongsTo(User, 'userId')
  }

  isPaid(): boolean {
    return this.status === 'paid'
  }
}
