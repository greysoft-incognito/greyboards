import { BaseController } from '../BaseController'
import { PaymentRegion } from '@app/models/PaymentRegion'
import { PaymentRegionCollection } from '@app/http/resources/PaymentRegionCollection'
import { PaymentRegionResource } from '@app/http/resources/PaymentRegionResource'
import { Gateways } from '@app/services/payments/Gateways'
import { ValidationException, regex } from 'kanun'
import { perPage } from '@arkstack/common'

const COUNTRY = regex(/^[A-Za-z]{2}$/)
const CURRENCY = regex(/^[A-Za-z]{3}$/)

/** Admins send groups of countries to their own currency and provider, at a fixed or live rate. */
export default class PaymentRegionController extends BaseController {
  async index() {
    const regions = await PaymentRegion.query().oldest('createdAt').paginate(perPage(this.query, { perPage: 50, maxPerPage: 100 }))

    return new PaymentRegionCollection(regions).additional({ status: 'success', message: 'OK', code: 200, providers: Gateways.options() })
  }

  async create() {
    const region = await this.save(new PaymentRegion({ active: true, rateMarkup: 0 }), true)

    return new PaymentRegionResource(region).additional({ status: 'success', message: 'Region added', code: 201 }).response().setStatusCode(201)
  }

  async update() {
    const region = await this.save(await PaymentRegion.query().findOrFail(String(this.params.region)), false)

    return new PaymentRegionResource(region).additional({ status: 'success', message: 'Region saved', code: 200 })
  }

  async destroy() {
    const region = await PaymentRegion.query().findOrFail(String(this.params.region))

    await region.delete()

    return new PaymentRegionResource(region).additional({ status: 'success', message: 'Region removed', code: 200 })
  }

  /** Fill a region from the form. A country can be in only one active region. */
  private async save(region: PaymentRegion, creating: boolean): Promise<PaymentRegion> {
    const required = creating ? 'required' : 'nullable'
    const data = await this.validate({
      name: `${required}|string|max:80`,
      countries: `${required}|array|min:1|max:250`,
      'countries.*': ['required', 'string', COUNTRY],
      currency: [required, 'string', CURRENCY],
      provider: 'nullable|string|max:40',
      exchangeRate: 'nullable|numeric|min:0',
      rateMarkup: 'nullable|numeric|min:0|max:100',
      active: 'nullable|boolean',
    })

    if (data.provider && !Gateways.has(String(data.provider))) throw ValidationException.withMessages({ provider: 'Pick a provider from the list.' })

    if (data.name) region.name = String(data.name).trim()
    if (data.countries) region.countries = [...new Set((data.countries as string[]).map((code) => code.toUpperCase()))]
    if (data.currency) region.currency = String(data.currency).toUpperCase()
    if ('provider' in data) region.provider = data.provider ? String(data.provider) : null
    if ('exchangeRate' in data) region.exchangeRate = Number(data.exchangeRate) > 0 ? Number(data.exchangeRate) : null
    if ('rateMarkup' in data) region.rateMarkup = Number(data.rateMarkup) || 0
    if (data.active !== undefined && data.active !== null) region.active = data.active === true || data.active === 'true'

    const taken = region.active ? await this.overlapping(region) : null

    if (taken) throw ValidationException.withMessages({ countries: `Some of these countries are already in ${taken.name}.` })

    await region.save()

    return region
  }

  /** Another active region that lists one of `region`'s countries. */
  private overlapping(region: PaymentRegion): Promise<PaymentRegion | null> {
    const query = PaymentRegion.scope('active').whereRaw(
      `exists (select 1 from jsonb_array_elements_text(countries::jsonb) as country where country in (${region.countries.map(() => '?').join(', ')}))`,
      region.countries,
    )

    if (region.id) query.whereRaw('id <> ?', [region.id])

    return query.first()
  }
}
