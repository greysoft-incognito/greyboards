import type { Payout } from '@app/models/Payout'
import { Resource } from 'resora'

/** One transfer to a bank account. */
export class PayoutResource extends Resource {
  async data() {
    const payout = this.resource as Payout

    return {
      id: payout.id,
      bookingId: payout.bookingId,
      account: payout.account,
      userId: payout.userId,
      ownerProfileId: payout.ownerProfileId,
      amountMinor: Number(payout.amountMinor),
      currency: payout.currency,
      bankName: payout.bankName,
      accountNumber: `••••••${payout.accountNumber.slice(-4)}`,
      accountName: payout.accountName,
      reference: payout.reference,
      status: payout.status,
      failureReason: payout.failureReason,
      paidAt: payout.paidAt,
      createdAt: payout.createdAt,
    }
  }
}
