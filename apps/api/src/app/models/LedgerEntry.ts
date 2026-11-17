import { Model } from '@arkstack/database'
import { Booking } from './Booking'

/** Where money sits: held for a booking, owed to an owner or scout, Greyboards' own, or owed back. */
export type LedgerAccount = 'escrow' | 'owner' | 'scout' | 'platform' | 'refund'

/**
 * One movement of money for a booking. Every balance is the sum of its entries, so each
 * naira can be traced back to the booking and payment that brought it in.
 */
export class LedgerEntry extends Model {
  declare id: string
  declare bookingId: string
  declare account: LedgerAccount
  declare kind: string
  declare amountMinor: number
  declare currency: string
  declare userId: string | null
  declare ownerProfileId: string | null
  declare reference: string | null
  declare memo: string | null
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'ledger_entries'

  protected static override columns = {
    bookingId: 'booking_id',
    amountMinor: 'amount_minor',
    userId: 'user_id',
    ownerProfileId: 'owner_profile_id',
  }

  protected override casts = {
    amountMinor: 'number',
  } as never

  booking() {
    return this.belongsTo(Booking, 'bookingId')
  }
}
