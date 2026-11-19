import type { Payment } from '@app/models/Payment'
import { Resource } from 'resora'

/** A payment for a booking, with the checkout page while it's being started. */
export class PaymentResource extends Resource {
  private checkoutUrl: string | null = null

  withCheckout(url: string): this {
    this.checkoutUrl = url

    return this
  }

  async data() {
    const payment = this.resource as Payment

    return {
      id: payment.id,
      reference: payment.reference,
      status: payment.status,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      chargeAmountMinor: Number(payment.chargeAmountMinor ?? payment.amountMinor),
      chargeCurrency: payment.chargeCurrency ?? payment.currency,
      bookingId: payment.bookingId,
      checkoutUrl: this.checkoutUrl,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    }
  }
}
