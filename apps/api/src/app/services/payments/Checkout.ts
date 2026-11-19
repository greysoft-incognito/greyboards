import { Booking } from '@app/models/Booking'
import { Payment } from '@app/models/Payment'
import { DispatchOffers } from '@app/services/DispatchOffers'
import { Shares } from '@app/services/Shares'
import type { PrintOffer } from '@app/models/PrintOffer'
import type { User } from '@app/models/User'
import { abortIf } from '@arkstack/common'
import { randomBytes } from 'node:crypto'
import { Gateways } from './Gateways'
import type { PaymentResult } from './PaymentGateway'
import { PaymentRegions } from './PaymentRegions'

/**
 * Sends an advertiser to the provider to pay for a held booking, or a dispatcher's price on a paid one,
 * and puts the money in escrow once it's paid. Payers are charged in their country's payment region
 * currency, through its provider; the booking and its escrow stay in the board's currency.
 */
export class Checkout {
  /** `country` is the payer's, from the request. */
  constructor(readonly country: string | null = null) {}

  /** A pending payment for `booking`, or on a shared booking for `user`'s unpaid shares, and the checkout page to finish it on. */
  async start(booking: Booking, user: User): Promise<{ payment: Payment; url: string }> {
    abortIf(!booking.isHeld(), 'Your hold on these dates expired. Book them again.', 422)

    const due = booking.shared ? await Shares.due(booking, user) : null

    abortIf(!!due && due.amountMinor <= 0, 'You’ve already paid your share.', 422)

    const amountMinor = due ? due.amountMinor : booking.amountMinor

    return this.charge(booking, user, amountMinor, due ? ', your share' : '', { shareIds: due ? due.shares.map((share) => share.id) : null })
  }

  /** A pending payment for a whole shared board, from whoever won the bidding for it, at their bid. */
  async startTakeover(booking: Booking, user: User): Promise<{ payment: Payment; url: string }> {
    const due = await Shares.takeoverDue(booking, user)

    return this.charge(booking, user, due.amountMinor, ', the whole board', { takeover: true })
  }

  /** A pending payment for a dispatcher's price to print and post a paid booking. */
  async startPrint(booking: Booking, offer: PrintOffer, user: User): Promise<{ payment: Payment; url: string }> {
    return this.charge(booking, user, offer.amountMinor, ', printing and posting', { printOfferId: offer.id })
  }

  private async charge(booking: Booking, user: User, amountMinor: number, suffix: string, link: Pick<Payment, 'shareIds'> | Pick<Payment, 'printOfferId'> | Pick<Payment, 'takeover'>): Promise<{ payment: Payment; url: string }> {
    const options = await PaymentRegions.for(this.country, booking.currency)
    const gateway = Gateways.checkout(options.provider)

    abortIf(!gateway.enabled(), 'Payments are not available right now.', 503)

    const board = await booking.board().firstOrFail()
    const chargeAmountMinor = options.charge(amountMinor)
    const { startsOn, endsOn } = booking.days()
    const reference = `${config('payments.reference_prefix')}${randomBytes(10).toString('hex').toUpperCase()}`
    const returnUrl = `${String(config('app.frontend_url')).replace(/\/+$/, '')}/checkout/complete?reference=${reference}`

    // Start with the provider first, so a failed start leaves no pending payment behind.
    const session = await gateway.initialize({
      reference,
      amount: chargeAmountMinor / 100,
      currency: options.currency,
      email: user.email,
      name: user.name,
      title: `${board.name}, ${startsOn} to ${endsOn}${suffix}`,
      returnUrl,
    })
    const payment = await Payment.query().create({
      userId: user.id,
      bookingId: booking.id,
      reference,
      provider: gateway.key,
      status: 'pending',
      amountMinor,
      currency: booking.currency,
      chargeAmountMinor,
      chargeCurrency: options.currency,
      exchangeRate: options.rate,
      paymentRegionId: options.region?.id ?? null,
      ...link,
    })

    return { payment, url: session.url }
  }

  /** Ask the provider about a pending payment and settle it once it has an answer. */
  async verify(payment: Payment): Promise<Payment> {
    if (!payment.isPending()) return payment

    const result = await Gateways.for(payment.provider).verify(payment.reference)

    if (!result.paid && !result.final) return payment

    return this.settle(payment, result)
  }

  /**
   * Record the provider's answer. Paying less than was charged, or in another currency than charged, doesn't count.
   * Only the first answer is recorded, so the webhook and the return page can both call this.
   */
  async settle(payment: Payment, result: PaymentResult): Promise<Payment> {
    const wrongCurrency = !!result.currency && result.currency !== payment.chargeCurrency.toUpperCase()
    const status = result.paid && !wrongCurrency && result.amount * 100 + 0.5 >= payment.chargeAmountMinor ? 'complete' : 'rejected'

    await Payment.transaction(async () => {
      const claimed = await Payment.query()
        .where({ id: payment.id, status: 'pending' })
        .updateFrom({ status, paidAt: status === 'complete' ? new Date() : null, response: result.raw })

      if (!claimed || status !== 'complete') return

      if (payment.printOfferId) return DispatchOffers.paid(payment)

      const booking = await Booking.query().findOrFail(payment.bookingId)

      if (payment.takeover) return Shares.takeOver(booking, payment)

      await booking.markPaid(payment)
    })

    return Payment.query().findOrFail(payment.id)
  }
}
