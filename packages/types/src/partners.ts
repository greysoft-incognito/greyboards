import type { ID } from './models'

export type IdentityDocument = 'nin' | 'passport' | 'drivers_licence' | 'voters_card'

/** `submitted` until a reviewer looks, then `verified` or `rejected`. */
export type IdentityStatus = 'submitted' | 'verified' | 'rejected'

export interface IdentityDocumentDefinition {
  type: IdentityDocument
  label: string
}

/** What a scout or dispatcher has shown before they are let in. */
export interface PartnerChecks {
  identity: {
    status: IdentityStatus
    documentType: IdentityDocument
    documentLabel: string
    fullName: string
    /** Mostly hidden for the account; whole for reviewers. */
    documentNumber: string
    /** Why a reviewer turned it down. */
    note: string | null
    /** For reviewers only. */
    photoUrl: string | null
    createdAt: string
  } | null
  bank: { bankName: string; accountName: string; maskedNumber: string } | null
  /** Whether the bank's name for the account matches the ID. Null until both are in. */
  namesMatch: boolean | null
  /** What is still needed before approval, such as "a bank account". */
  missing: string[]
}

export interface IdentityInput {
  documentType: IdentityDocument
  documentNumber: string
  fullName: string
}

/** A reviewer's decision on the ID photo alone. */
export interface IdentityReview {
  status: Exclude<IdentityStatus, 'submitted'>
  note?: string | null
}

/** The board a new tag may repeat, for reviewers. */
export interface DuplicateBoard {
  id: ID
  name: string
  status: 'pending' | 'listed' | 'rejected' | 'unlisted'
  taggedById: ID | null
}
