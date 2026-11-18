import { Model } from '@arkstack/database'
import type { QueryBuilder } from 'arkormx'

/**
 * A group of countries that prices and pays in its own currency, through its own provider
 * when one is set. Amounts are converted at the region's fixed rate, or the live rate plus its markup.
 */
export class PaymentRegion extends Model {
  declare id: string
  declare name: string
  declare countries: string[]
  declare currency: string
  declare provider: string | null
  declare exchangeRate: number | null
  declare rateMarkup: number
  declare active: boolean
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'payment_regions'

  protected static override columns = {
    exchangeRate: 'exchange_rate',
    rateMarkup: 'rate_markup',
  }

  protected override casts = {
    countries: 'json',
    exchangeRate: 'number',
    rateMarkup: 'number',
    active: 'boolean',
  } as never

  scopeActive(query: QueryBuilder<PaymentRegion>): QueryBuilder<PaymentRegion> {
    return query.where({ active: true })
  }

  /** The active region that lists `country`, if any. */
  static async covering(country: string): Promise<PaymentRegion | null> {
    return PaymentRegion.scope('active')
      .whereRaw('countries::jsonb @> ?::jsonb', [JSON.stringify([country.toUpperCase()])])
      .oldest('createdAt')
      .first()
  }

  covers(country: string): boolean {
    return (this.countries ?? []).includes(country.toUpperCase())
  }
}
