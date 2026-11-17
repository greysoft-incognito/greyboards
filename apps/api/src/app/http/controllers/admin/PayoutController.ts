import { Payout, type PayoutStatus } from '@app/models/Payout'
import { PayoutCollection } from '@app/http/resources/PayoutCollection'
import { PayoutResource } from '@app/http/resources/PayoutResource'
import { Payouts } from '@app/services/Payouts'
import { BaseController } from '../BaseController'
import { RequestException, perPage } from '@arkstack/common'

/** Every payout, for staff who follow the money and send failed transfers again. */
export default class PayoutController extends BaseController {
  async index() {
    const filters = await this.validateQuery({ status: `nullable|in:${Payout.STATUSES.join(',')}` })
    const query = Payout.query()

    if (filters.status) query.where({ status: filters.status as PayoutStatus })

    const payouts = await query.latest('createdAt').paginate(perPage(this.query, { perPage: 25, maxPerPage: 100 }))

    return new PayoutCollection(payouts).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async retry() {
    const payout = await Payout.query().find(String(this.params.payout))

    if (!payout) throw new RequestException('Payout not found.', 404)

    const sent = await Payouts.retry(payout)

    return new PayoutResource(sent).additional({ status: 'success', message: sent.status === 'failed' ? 'It failed again.' : 'Sent again.', code: 200 })
  }
}
