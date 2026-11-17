import { Booking } from '@app/models/Booking'
import { Payment } from '@app/models/Payment'
import { Shares } from '@app/services/Shares'
import type { User } from '@app/models/User'
import { abortIf } from '@arkstack/common'
import { randomBytes } from 'node:crypto'
import { Gateways } from './Gateways'
import type { PaymentGateway, PaymentResult } from './PaymentGateway'

/** Sends an advertiser to the provider to pay for a held booking, and puts the money in escrow once it's paid. */
export class Checkout {
  constructor(readonly gateway: PaymentGateway = Gateways.current()) {}

  /** A pending payment for `booking`, or on a shared booking for `user`'s unpaid shares, and the checkout page to finish it on. */
  async start(booking: Booking, user: User): Promise<{ payment: Payment; url: string }> {
    abortIf(!booking.isHeld(), 'The hold on these dates ran out. Book them again.', 422)
    abortIf(!this.gateway.enabled(), 'Payments are not available right now.', 503)

    const due = booking.shared ? await Shares.due(booking, user) : null

    abortIf(!!due && due.amountMinor <= 0, 'You have no share of this booking left to pay.', 422)

    const amountMinor = due ? due.amountMinor : booking.amountMinor

    const board = await booking.board().firstOrFail()
    const { startsOn, endsOn } = booking.days()
    const reference = `${config('payments.reference_prefix')}${randomBytes(10).toString('hex').toUpperCase()}`
    const returnUrl = `${String(config('app.frontend_url')).replace(/\/+$/, '')}/checkout/complete?reference=${reference}`

    // Start with the provider first, so a failed start leaves no pending payment behind.
    const session = await this.gateway.initialize({
      reference,
      amount: amountMinor / 100,
      currency: booking.currency,
      email: user.email,
      name: user.name,
      title: `${board.name}, ${startsOn} to ${endsOn}${due ? ', your share' : ''}`,
      returnUrl,
    })
    const payment = await Payment.query().create({
      userId: user.id,
      bookingId: booking.id,
      reference,
      provider: this.gateway.key,
      status: 'pending',
      amountMinor,
      currency: booking.currency,
      shareIds: due ? due.shares.map((share) => share.id) : null,
    })

    return { payment, url: session.url }
  }

  /** Ask the provider about a pending payment and settle it once it has an answer. */
  async verify(payment: Payment): Promise<Payment> {
    if (!payment.isPending()) return payment

    const result = await this.gateway.verify(payment.reference)

    if (!result.paid && !result.final) return payment

    return this.settle(payment, result)
  }

  /**
   * Record the provider's answer. Paying less than was charged, or in another currency, doesn't count.
   * Only the first answer is recorded, so the webhook and the return page can both call this.
   */
  async settle(payment: Payment, result: PaymentResult): Promise<Payment> {
    const wrongCurrency = !!result.currency && result.currency !== payment.currency.toUpperCase()
    const status = result.paid && !wrongCurrency && result.amount * 100 + 0.5 >= payment.amountMinor ? 'complete' : 'rejected'

    await Payment.transaction(async () => {
      const claimed = await Payment.query()
        .where({ id: payment.id, status: 'pending' })
        .updateFrom({ status, paidAt: status === 'complete' ? new Date() : null, response: result.raw })

      if (!claimed || status !== 'complete') return

      const booking = await Booking.query().findOrFail(payment.bookingId)

      await booking.markPaid(payment)
    })

    return Payment.query().findOrFail(payment.id)
  }
}
