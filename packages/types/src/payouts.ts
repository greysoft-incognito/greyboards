import type { ID } from './models'

/** A bank someone can be paid into. */
export interface Bank {
  code: string
  name: string
}

/** Where someone is paid. The number comes back mostly hidden, such as ••••••6789. */
export interface PayoutAccount {
  bankCode: string
  bankName: string
  accountNumber: string
  /** The name the bank has on the account. */
  accountName: string
  currency: string
  updatedAt: string
}

/** The account's own bank details, each owner it takes payouts for, and what's owed and paid. */
export interface PayoutSummary {
  /** Whether payouts go out automatically yet. */
  enabled: boolean
  account: PayoutAccount | null
  owners: { profileId: ID; name: string; account: PayoutAccount | null }[]
  /** Released to them and not yet sent. */
  owedMinor: number
  paidMinor: number
}

/** `processing` while the bank sends it, then `paid`, or `failed`. */
export type PayoutStatus = 'processing' | 'paid' | 'failed'

/** One transfer to a bank account, for one share of one booking. */
export interface Payout {
  id: ID
  bookingId: ID
  account: 'owner' | 'scout' | 'billposter'
  userId: ID | null
  ownerProfileId: ID | null
  amountMinor: number
  currency: string
  bankName: string
  accountNumber: string
  accountName: string
  reference: string
  status: PayoutStatus
  failureReason: string | null
  paidAt: string | null
  createdAt: string
}

export interface PayoutAccountInput {
  bankCode: string
  accountNumber: string
}
