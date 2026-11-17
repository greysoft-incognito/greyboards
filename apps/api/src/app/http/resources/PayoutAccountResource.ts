import type { PayoutAccount } from '@app/models/PayoutAccount'
import { Resource } from 'resora'

/** Where someone is paid, with the account number mostly hidden. */
export class PayoutAccountResource extends Resource {
  async data() {
    const account = this.resource as PayoutAccount

    return {
      bankCode: account.bankCode,
      bankName: account.bankName,
      accountNumber: account.maskedNumber(),
      accountName: account.accountName,
      currency: account.currency,
      updatedAt: account.updatedAt,
    }
  }
}
