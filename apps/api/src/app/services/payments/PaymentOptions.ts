import { ceil, multiply, round } from '@toneflix/money'
import type { PaymentRegion } from '@app/models/PaymentRegion'

/** How one payer pays: the currency they are charged in, its rate from the price's currency, and the provider that charges them. */
export class PaymentOptions {
  constructor(
    readonly country: string | null,
    readonly currency: string,
    readonly provider: string,
    readonly rate = 1,
    readonly region: PaymentRegion | null = null,
  ) {}

  /** An amount in minor units of the price's currency, in minor units of the charge currency. Rounded up so the payer never pays less than the price. */
  charge(amountMinor: number): number {
    return ceil(round(multiply(amountMinor, this.rate), 4))
  }

  toJSON() {
    return {
      country: this.country,
      currency: this.currency,
      provider: this.provider,
      rate: this.rate,
      region: this.region ? { id: this.region.id, name: this.region.name } : null,
    }
  }
}
