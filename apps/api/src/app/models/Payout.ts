import { Model } from '@arkstack/database'
import type { LedgerAccount } from './LedgerEntry'

/** `processing` while the bank sends it, then `paid`, or `failed` to try again. */
export type PayoutStatus = 'processing' | 'paid' | 'failed'

/**
 * One transfer to someone's bank account, for one share of one booking. The bank details are
 * copied in so the record stays true if the account changes later.
 */
export class Payout extends Model {
  declare id: string
  declare ledgerEntryId: string
  declare bookingId: string
  declare account: LedgerAccount
  declare userId: string | null
  declare ownerProfileId: string | null
  declare amountMinor: number
  declare currency: string
  declare bankCode: string
  declare bankName: string
  declare accountNumber: string
  declare accountName: string
  declare reference: string
  declare provider: string
  declare status: PayoutStatus
  declare failureReason: string | null
  declare response: Record<string, unknown> | null
  declare paidAt: Date | null
  declare createdAt: Date
  declare updatedAt: Date

  static readonly STATUSES: PayoutStatus[] = ['processing', 'paid', 'failed']

  protected static override table = 'payouts'

  protected static override columns = {
    ledgerEntryId: 'ledger_entry_id',
    bookingId: 'booking_id',
    userId: 'user_id',
    ownerProfileId: 'owner_profile_id',
    amountMinor: 'amount_minor',
    bankCode: 'bank_code',
    bankName: 'bank_name',
    accountNumber: 'account_number',
    accountName: 'account_name',
    failureReason: 'failure_reason',
    paidAt: 'paid_at',
  }

  protected override casts = {
    amountMinor: 'number',
    response: 'json',
    paidAt: 'datetime',
  } as never
}
