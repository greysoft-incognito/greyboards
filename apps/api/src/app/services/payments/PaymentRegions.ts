import { PaymentRegion } from '@app/models/PaymentRegion'
import { Settings } from '@app/support/Settings'
import { ExchangeRates } from './ExchangeRates'
import { PaymentOptions } from './PaymentOptions'

/**
 * Decides the currency each country prices and pays in. A country in an active region uses
 * that region's currency and provider; everywhere else uses the default currency and provider.
 */
export class PaymentRegions {
  /** The two-letter country from the first hint that holds one. */
  static country(...hints: unknown[]): string | null {
    for (const hint of hints) {
      const code = String(hint ?? '')
        .trim()
        .toUpperCase()

      if (/^[A-Z]{2}$/.test(code) && !['XX', 'T1'].includes(code)) return code
    }

    return null
  }

  static async defaultCurrency(): Promise<string> {
    return String(await Settings.get('payments.default_currency')).toUpperCase()
  }

  static async defaultProvider(): Promise<string> {
    return String(await Settings.get('payments.provider'))
  }

  /** The currency boards in `country` are priced in. */
  static async currencyFor(country: string | null | undefined): Promise<string> {
    const region = country ? await PaymentRegion.covering(country) : null

    return region ? region.currency.toUpperCase() : PaymentRegions.defaultCurrency()
  }

  /** The currency of each country in an active region. A country is in one active region at most, so there are never more regions than countries. */
  static async currencies(): Promise<Record<string, string>> {
    const regions = await PaymentRegion.scope('active').oldest('createdAt').limit(250).get()

    return Object.fromEntries(regions.all().flatMap((region) => (region.countries ?? []).map((country) => [country, region.currency.toUpperCase()])))
  }

  /** How a payer in `country` pays an amount priced in `currency`. */
  static async for(country: string | null, currency: string): Promise<PaymentOptions> {
    const region = country ? await PaymentRegion.covering(country) : null
    const provider = region?.provider || (await PaymentRegions.defaultProvider())

    if (!region) return new PaymentOptions(country, currency.toUpperCase(), provider)

    return new PaymentOptions(country, region.currency.toUpperCase(), provider, await PaymentRegions.rate(region, currency), region)
  }

  /** How much one unit of `currency` is worth in the region's currency. A fixed rate is from the default currency. */
  static async rate(region: PaymentRegion, currency: string): Promise<number> {
    if (region.currency.toUpperCase() === currency.toUpperCase()) return 1
    if (region.exchangeRate && currency.toUpperCase() === (await PaymentRegions.defaultCurrency())) return Number(region.exchangeRate)

    return (await ExchangeRates.rate(currency, region.currency)) * (1 + (Number(region.rateMarkup) || 0) / 100)
  }
}
