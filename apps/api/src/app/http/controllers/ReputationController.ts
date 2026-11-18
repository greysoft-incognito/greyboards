import { AccountRole, type AccountRoleKind } from '@app/models/AccountRole'
import { ReputationEvent } from '@app/models/ReputationEvent'
import { ReputationEventCollection } from '@app/http/resources/ReputationEventCollection'
import { Reputation } from '@app/services/Reputation'
import { BaseController } from './BaseController'
import { GenericResource } from 'resora'
import { assertFound, perPage } from '@arkstack/common'

/** What reputation and the two badges mean, and the signed-in account's own history. */
export default class ReputationController extends BaseController {
  /** The badges and what earns points, with the numbers in use now. Works signed out, so anyone who sees a badge can read it. */
  async disclosure() {
    return new GenericResource(await Reputation.disclosure()).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** How one of the account's roles earned and lost points, newest first. */
  async history() {
    const kind = String(this.params.kind) as AccountRoleKind
    const role = AccountRole.kinds().includes(kind) ? await this.user.accountRoles().where({ kind }).first() : null

    assertFound(role, 'You do not hold this role.', 404)

    const events = await ReputationEvent.query().scope('ofRole', role.id).latest('createdAt').paginate(perPage(this.query, { perPage: 20, maxPerPage: 50 }))

    return new ReputationEventCollection(events).additional({ status: 'success', message: 'OK', code: 200 })
  }
}
