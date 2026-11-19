import { BaseController } from './BaseController'
import { GenericResource } from 'resora'
import { PaymentRegions } from '@app/services/payments/PaymentRegions'

/** The currency apps price things in for a country, the default, and every region's currency. */
export default class CurrencyController extends BaseController {
  async show() {
    const country = this.country()

    return new GenericResource({
      country,
      currency: await PaymentRegions.currencyFor(country),
      default: await PaymentRegions.defaultCurrency(),
      regions: await PaymentRegions.currencies(),
    }).additional({ status: 'success', message: 'OK', code: 200 })
  }
}
