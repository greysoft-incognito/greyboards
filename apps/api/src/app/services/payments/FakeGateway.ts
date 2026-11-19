import { Payment } from '@app/models/Payment'
import type { Bank, PaymentGateway, PaymentRequest, PaymentResult, PayoutGateway, RefundGateway, RefundResult, TransferRequest, TransferResult } from './PaymentGateway'

/**
 * Approves every payment and transfer at once, for development and tests. It sends the payer
 * straight back to the return page and never runs in production. Account number 0000000000
 * belongs to nobody, and transfers to 0000000001 fail.
 */
export class FakeGateway implements PaymentGateway, PayoutGateway, RefundGateway {
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

    return { paid: true, final: true, amount: payment.chargeAmountMinor / 100, currency: payment.chargeCurrency, raw: { fake: true } }
  }

  async banks(): Promise<Bank[]> {
    return [
      { code: '044', name: 'Access Bank' },
      { code: '058', name: 'GTBank' },
      { code: '033', name: 'United Bank for Africa' },
    ]
  }

  async accountName(_bankCode: string, accountNumber: string): Promise<string | null> {
    return accountNumber === '0000000000' ? null : 'Test Account Holder'
  }

  async transfer(request: TransferRequest): Promise<TransferResult> {
    const failed = request.accountNumber === '0000000001'

    return { paid: !failed, final: true, reason: failed ? 'The bank turned the transfer down.' : null, raw: { fake: true } }
  }

  async transferStatus(): Promise<TransferResult> {
    return { paid: true, final: true, reason: null, raw: { fake: true } }
  }

  async refund(payment: { reference: string }): Promise<RefundResult> {
    return { id: `fake-refund-${payment.reference}`, refunded: true, final: true, reason: null, raw: { fake: true } }
  }

  async refundStatus(id: string): Promise<RefundResult> {
    return { id, refunded: true, final: true, reason: null, raw: { fake: true } }
  }
}
