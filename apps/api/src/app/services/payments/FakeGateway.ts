import { Payment } from '@app/models/Payment'
import type { PaymentGateway, PaymentRequest, PaymentResult } from './PaymentGateway'

/**
 * Approves every payment at once, for development and tests. It sends the payer straight
 * back to the return page and never runs in production.
 */
export class FakeGateway implements PaymentGateway {
  readonly key = 'fake'

  enabled(): boolean {
    return config('app.env') !== 'production'
  }

  async initialize(request: PaymentRequest): Promise<{ url: string }> {
    return { url: request.returnUrl }
  }

  async verify(reference: string): Promise<PaymentResult> {
    const payment = await Payment.query().where({ reference }).first()

    if (!payment) return { paid: false, final: false, amount: 0, currency: null, raw: {} }

    return { paid: true, final: true, amount: payment.amountMinor / 100, currency: payment.currency, raw: { fake: true } }
  }
}
