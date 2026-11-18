import { Model } from '@arkstack/database'
import { abortIf } from '@arkstack/common'
import { Gateways } from '@app/services/payments/Gateways'
import { Settings } from '@app/support/Settings'
import type { OwnerProfile } from './OwnerProfile'
import type { User } from './User'

/** Who a payout account belongs to: an account (scouts, dispatchers) or an owner profile (owners' shares). */
export type PayoutHolder = { userId: string } | { ownerProfileId: string }

/**
 * The bank account someone is paid into. The name comes from the bank, never from what was
 * typed, so money can't go to an account that doesn't match.
 */
export class PayoutAccount extends Model {
  declare id: string
  declare userId: string | null
  declare ownerProfileId: string | null
  declare bankCode: string
  declare bankName: string
  declare accountNumber: string
  declare accountName: string
  declare currency: string
  declare updatedById: string | null
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'payout_accounts'

  protected static override columns = {
    userId: 'user_id',
    ownerProfileId: 'owner_profile_id',
    bankCode: 'bank_code',
    bankName: 'bank_name',
    accountNumber: 'account_number',
    accountName: 'account_name',
    updatedById: 'updated_by_id',
  }

  static holderOf(user: User): PayoutHolder {
    return { userId: user.id }
  }

  static profileHolder(profile: OwnerProfile): PayoutHolder {
    return { ownerProfileId: profile.id }
  }

  static find(holder: PayoutHolder): Promise<PayoutAccount | null> {
    return PayoutAccount.query().where(holder).first()
  }

  /** Check the account with the bank and save it as where `holder` is paid. */
  static async save(holder: PayoutHolder, editor: User, bankCode: string, accountNumber: string): Promise<PayoutAccount> {
    const gateway = Gateways.payouts()
    const banks = await gateway.banks(String(await Settings.get('payouts.country')))
    const bank = banks.find((candidate) => candidate.code === bankCode)

    abortIf(!bank, 'Select your bank.', 422)

    const accountName = await gateway.accountName(bankCode, accountNumber)

    abortIf(!accountName, 'We couldn’t find that account. Check the number and try again.', 422)

    const details = { bankCode, bankName: bank!.name, accountNumber, accountName: accountName!, currency: 'NGN', updatedById: editor.id }
    const existing = await PayoutAccount.find(holder)

    if (existing) {
      await existing.update(details)

      return existing
    }

    return PayoutAccount.query().create({ ...holder, ...details })
  }

  /** The account number with all but the last four digits hidden. */
  maskedNumber(): string {
    return `••••••${this.accountNumber.slice(-4)}`
  }
}
