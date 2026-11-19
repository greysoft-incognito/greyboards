import { PaymentRegion } from '@app/models/PaymentRegion'
import { PaymentRegions } from '@app/services/payments/PaymentRegions'
import { MockSeeder } from '../MockSeeder'

/**
 * Regions for the countries outside Nigeria that have boards, so their boards price and pay
 * in local money. Ghana and Kenya use fixed rates from the default currency, the UK and US the
 * live rate with a markup.
 */
export class MockPaymentRegionSeeder extends MockSeeder {
  async run(): Promise<void> {
    const provider = await PaymentRegions.defaultProvider()
    const regions = [
      { name: 'Ghana', countries: ['GH'], currency: 'GHS', exchangeRate: 0.0078, rateMarkup: 0 },
      { name: 'East Africa', countries: ['KE', 'UG', 'TZ', 'RW'], currency: 'KES', exchangeRate: 0.084, rateMarkup: 0 },
      { name: 'United Kingdom', countries: ['GB'], currency: 'GBP', exchangeRate: null, rateMarkup: 2 },
      { name: 'United States', countries: ['US'], currency: 'USD', exchangeRate: null, rateMarkup: 2 },
    ]
    const taken = new Set(
      (await PaymentRegion.query().limit(250).get())
        .all()
        .flatMap((region) => region.countries ?? []),
    )
    const rows = regions
      .filter((region) => !region.countries.some((country) => taken.has(country)))
      .map((region) => ({ id: this.data.id(), ...region, countries: JSON.stringify(region.countries), provider, active: true, ...this.data.stamps(-150) }))

    await this.data.insert(PaymentRegion, rows)
  }
}
