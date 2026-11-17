import { Model } from '@arkstack/database'
import { Booking } from './Booking'
import { User } from './User'

export type PaymentStatus = 'pending' | 'complete' | 'rejected'

/** One attempt to pay for a booking on the provider's checkout. Amounts are in minor units. */
export class Payment extends Model {
  declare id: string
  declare userId: string
  declare bookingId: string
  declare reference: string
  declare provider: string
  declare status: PaymentStatus
  declare amountMinor: number
  /** On a shared booking, the shares this payment is for. */
  declare shareIds: string[] | null
  /** A payment for a dispatcher's price to print and post, after the rent was paid. */
  declare printOfferId: string | null
  /** A payment for a whole shared board, taking it over from the people sharing it. */
  declare takeover: boolean
  declare currency: string
  declare response: Record<string, unknown> | null
  declare paidAt: Date | null
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'payments'

  protected static override columns = {
    userId: 'user_id',
    bookingId: 'booking_id',
    amountMinor: 'amount_minor',
    paidAt: 'paid_at',
    shareIds: 'share_ids',
    printOfferId: 'print_offer_id',
  }

  protected override casts = {
    amountMinor: 'number',
    response: 'json',
    shareIds: 'json',
    paidAt: 'datetime',
  } as never

  user() {
    return this.belongsTo(User, 'userId')
  }

  booking() {
    return this.belongsTo(Booking, 'bookingId')
  }

  isPending(): boolean {
    return this.status === 'pending'
  }
}
