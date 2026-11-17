import type { BoardAgreement } from '@app/models/BoardAgreement'
import { Resource } from 'resora'

/** Where an owner agreement stands, for the scout who sent it and for reviewers. */
export class BoardAgreementResource extends Resource {
  async data() {
    const agreement = this.resource as BoardAgreement
    const rate = agreement.rate()

    return {
      id: agreement.id,
      status: agreement.displayStatus(),
      ownerName: agreement.ownerName,
      ownerPhone: agreement.ownerPhone,
      ownerSharePercent: agreement.ownerSharePercent,
      rate: rate === null ? null : { amountMinor: rate, currency: agreement.currency, period: agreement.ratePeriod },
      sendCount: agreement.sendCount,
      lastSentAt: agreement.lastSentAt,
      resendInSeconds: agreement.isOpen() ? agreement.secondsUntilResend() : null,
      expiresAt: agreement.expiresAt,
      signedName: agreement.signedName,
      signedAt: agreement.signedAt,
      declinedAt: agreement.declinedAt,
      createdAt: agreement.createdAt,
    }
  }
}
