import { FakeGateway } from './FakeGateway'
import { Flutterwave } from './Flutterwave'
import type { PaymentGateway, PayoutGateway } from './PaymentGateway'

/** The gateway payments go through, chosen by `payments.driver`. */
export class Gateways {
  static current(): PaymentGateway {
    return config('payments.driver') === 'fake' ? new FakeGateway() : new Flutterwave()
  }

  /** The gateway a stored payment was made with. */
  static for(provider: string): PaymentGateway {
    return provider === 'fake' ? new FakeGateway() : new Flutterwave()
  }

  /** The gateway payouts go through. */
  static payouts(): PayoutGateway {
    return config('payments.driver') === 'fake' ? new FakeGateway() : new Flutterwave()
  }
}
