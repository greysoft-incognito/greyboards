import { FakeGateway } from './FakeGateway'
import { Flutterwave } from './Flutterwave'
import type { PaymentGateway, PayoutGateway, RefundGateway } from './PaymentGateway'
import { Settings } from '@app/support/Settings'

type Provider = PaymentGateway & PayoutGateway & RefundGateway

/**
 * Every payment provider by its key. A new provider implements the gateway interfaces and is
 * added to `PROVIDERS`; payment regions and the default provider setting then pick it by key.
 * With `payments.driver` set to fake, new payments and payouts go through the fake gateway.
 */
export class Gateways {
  static readonly PROVIDERS: Record<string, { label: string; make: () => Provider }> = {
    flutterwave: { label: 'Flutterwave', make: () => new Flutterwave() },
  }

  /** Providers admins can choose from. */
  static options(): { value: string; label: string }[] {
    return Object.entries(Gateways.PROVIDERS).map(([value, provider]) => ({ value, label: provider.label }))
  }

  static has(key: string): boolean {
    return key in Gateways.PROVIDERS
  }

  /** The provider with `key`, or the fake one for payments it made. */
  static make(key: string): Provider {
    if (key === 'fake') return new FakeGateway()

    return (Gateways.PROVIDERS[key] ?? Gateways.PROVIDERS.flutterwave!).make()
  }

  /** The gateway a new payment goes through when its payer's region picks `provider`. */
  static checkout(provider: string): PaymentGateway {
    return Gateways.make(Gateways.faked() ? 'fake' : provider)
  }

  /** The gateway a stored payment was made with. */
  static for(provider: string): PaymentGateway {
    return Gateways.make(provider)
  }

  /** The gateway payouts go through: the default provider. */
  static async payouts(): Promise<PayoutGateway> {
    return Gateways.make(Gateways.faked() ? 'fake' : String(await Settings.get('payments.provider')))
  }

  /** The gateway that refunds a payment made with `provider`. */
  static refunds(provider: string): RefundGateway {
    return Gateways.make(provider)
  }

  private static faked(): boolean {
    return config('payments.driver') === 'fake'
  }
}
