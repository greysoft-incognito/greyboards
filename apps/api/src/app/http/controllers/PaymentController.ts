import { Payment } from '@app/models/Payment'
import { PaymentResource } from '@app/http/resources/PaymentResource'
import { Checkout } from '@app/services/payments/Checkout'
import { Flutterwave } from '@app/services/payments/Flutterwave'
import { RelayWebhook } from '@app/services/payments/RelayWebhook'
import { BaseController } from './BaseController'
import { abortIf } from '@arkstack/common'

/** Payments for bookings, finished on the provider's hosted checkout. */
export default class PaymentController extends BaseController {
  /** Check a payment with the provider, e.g. when the payer comes back from the checkout. */
  async verify() {
    const pending = await Payment.query().where({ reference: String(this.params.reference), userId: this.user.id }).firstOrFail()
    const payment = await new Checkout().verify(pending)

    return new PaymentResource(payment).additional({ status: 'success', message: payment.status === 'complete' ? 'Payment received' : 'OK', code: 200 })
  }

  /** Flutterwave tells us about payments here, through the payment relay. Each one is checked with Flutterwave before it counts. */
  async flutterwave() {
    const gateway = new Flutterwave()

    abortIf(!RelayWebhook.accepts(this.ctx.req.rawBody, this.ctx.req.get(RelayWebhook.header)), 'Webhooks are accepted only from the payment relay.', 401)
    abortIf(!gateway.validWebhook(this.ctx.req.get('verif-hash')), 'Invalid signature.', 401)

    const event = String(this.body.event ?? this.body['event.type'] ?? '').toLowerCase()
    const reference = this.body.data?.tx_ref ?? this.body.txRef

    if (event.startsWith('charge') && reference) {
      const payment = await Payment.query().where({ reference: String(reference), provider: gateway.key }).first()

      if (payment) await new Checkout().verify(payment)
    }

    return this.ctx.res.status(200).json({ status: 'ok' })
  }
}
