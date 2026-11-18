import { abortIf } from '@arkstack/common'
import { IdentityCheck } from '@app/models/IdentityCheck'
import { PayoutAccount } from '@app/models/PayoutAccount'
import type { User } from '@app/models/User'
import { Settings } from '@app/support/Settings'

/** What a scout or dispatcher has shown so far, as the account or a reviewer sees it. */
export interface PartnerCheckSummary {
  identity: {
    status: IdentityCheck['status']
    documentType: IdentityCheck['documentType']
    documentLabel: string
    fullName: string
    documentNumber: string
    note: string | null
    photoUrl: string | null
    createdAt: Date
  } | null
  bank: { bankName: string; accountName: string; maskedNumber: string } | null
  /** Whether the bank's name for the account matches the name on the ID. Null until both are in. */
  namesMatch: boolean | null
  /** What is still needed before approval, in words. */
  missing: string[]
}

/**
 * The checks scouts and dispatchers pass before they handle other people's boards and
 * money: a government ID a reviewer looked at, and a bank account the bank confirmed.
 * The one place that decides whether an application can be approved.
 */
export class PartnerChecks {
  /** Where `user` stands. Reviewers see the full ID number and the photo. */
  static async summary(user: User, forReviewer: boolean): Promise<PartnerCheckSummary> {
    const identity = await IdentityCheck.of(user)
    const bank = await PayoutAccount.find(PayoutAccount.holderOf(user))

    return {
      identity: identity
        ? {
            status: identity.status,
            documentType: identity.documentType,
            documentLabel: IdentityCheck.DOCUMENTS.find((document) => document.type === identity.documentType)?.label ?? identity.documentType,
            fullName: identity.fullName,
            documentNumber: forReviewer ? identity.documentNumber : identity.maskedNumber(),
            note: identity.note,
            photoUrl: forReviewer ? await identity.photoUrl() : null,
            createdAt: identity.createdAt,
          }
        : null,
      bank: bank ? { bankName: bank.bankName, accountName: bank.accountName, maskedNumber: bank.maskedNumber() } : null,
      namesMatch: identity && bank ? PartnerChecks.namesMatch(identity.fullName, bank.accountName) : null,
      missing: await PartnerChecks.missing(identity, bank),
    }
  }

  /** Refuse to approve someone who hasn't sent what the settings ask for. Approving marks their ID checked. */
  static async approve(user: User, reviewer: User): Promise<void> {
    const identity = await IdentityCheck.of(user)
    const bank = await PayoutAccount.find(PayoutAccount.holderOf(user))
    const missing = await PartnerChecks.missing(identity, bank)

    abortIf(missing.length > 0, `They still need to add: ${missing.join(' and ')}.`, 422)

    if (identity && identity.status !== 'verified') await identity.review(reviewer, 'verified')
  }

  /**
   * Whether two names share enough words to be the same person, ignoring case, order and
   * punctuation: every word of the shorter name, or at least two words.
   */
  static namesMatch(first: string, second: string): boolean {
    const words = (name: string) => new Set(name.toLowerCase().replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter((word) => word.length > 1))
    const a = words(first)
    const b = words(second)
    const shared = [...a].filter((word) => b.has(word)).length

    return shared > 0 && (shared >= 2 || shared === Math.min(a.size, b.size))
  }

  private static async missing(identity: IdentityCheck | null, bank: PayoutAccount | null): Promise<string[]> {
    const missing: string[] = []

    if ((await Settings.get('partners.require_id')) && (!identity || identity.status === 'rejected')) missing.push('a photo of their ID')
    if ((await Settings.get('partners.require_bank')) && !bank) missing.push('a bank account')

    return missing
  }
}
