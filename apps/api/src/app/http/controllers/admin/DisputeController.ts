import { Dispute, type DisputeDecision } from '@app/models/Dispute'
import { DisputeCollection } from '@app/http/resources/DisputeCollection'
import { Disputes } from '@app/services/Disputes'
import { BaseController } from '../BaseController'
import { GenericResource } from 'resora'
import { RequestException, perPage } from '@arkstack/common'

/** Disputes for staff to look into and decide. */
export default class DisputeController extends BaseController {
  /** Open disputes oldest first, so the longest waiting comes first; decided ones newest first. */
  async index() {
    const filters = await this.validateQuery({ status: 'nullable|in:open,resolved' })
    const status = filters.status === 'resolved' ? 'resolved' : 'open'
    const query = Dispute.query().where({ status })
    const disputes = await (status === 'open' ? query.oldest('createdAt') : query.latest('resolvedAt')).paginate(perPage(this.query, { perPage: 25, maxPerPage: 100 }))

    return new DisputeCollection(disputes).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async resolve() {
    const dispute = await Dispute.query().find(String(this.params.dispute))

    if (!dispute) throw new RequestException('Dispute not found.', 404)

    const data = await this.validate({
      decision: `required|in:${Dispute.DECISIONS.join(',')}`,
      resolution: 'required|string|min:5|max:1000',
      refund: 'nullable|numeric|min:1',
    })
    const refundMinor = data.refund ? Math.round(Number(data.refund) * 100) : null
    const decided = await Disputes.resolve(dispute, this.user, data.decision as DisputeDecision, String(data.resolution), refundMinor)

    return new GenericResource(DisputeCollection.present(decided, await DisputeCollection.names([decided]))).additional({ status: 'success', message: 'Dispute decided.', code: 200 })
  }
}
