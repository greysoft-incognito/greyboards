import { AccountRole, type AccountRoleKind, type AccountRoleStatus } from '@app/models/AccountRole'
import { AdminAccountRoleCollection } from '@app/http/resources/AdminAccountRoleCollection'
import { AdminAccountRoleResource } from '@app/http/resources/AdminAccountRoleResource'
import { BaseController } from '../BaseController'
import { IdentityCheck } from '@app/models/IdentityCheck'
import { ReputationEvent } from '@app/models/ReputationEvent'
import { ReputationEventCollection } from '@app/http/resources/ReputationEventCollection'
import { Reputation } from '@app/services/Reputation'
import { RequestException, perPage } from '@arkstack/common'

/** Reviewers approve, reject or suspend the scouts and dispatchers who apply, and staff verify roles and correct their reputation. */
export default class AccountRoleController extends BaseController {
  async index() {
    const filters = await this.validateQuery({
      kind: `nullable|in:${AccountRole.kinds().join(',')}`,
      status: `nullable|in:${AccountRole.STATUSES.join(',')}`,
      badge: 'nullable|in:verified,proven',
      sort: 'nullable|in:oldest,reputation',
    })

    const query = AccountRole.query()

    if (filters.kind) query.scope('ofKind', filters.kind as AccountRoleKind)
    if (filters.status) query.scope('withStatus', filters.status as AccountRoleStatus)
    if (filters.badge) query.whereNotNull(filters.badge === 'verified' ? 'verifiedAt' : 'provenAt')

    if (filters.sort === 'reputation') query.latest('reputation')
    else query.oldest('createdAt')

    const roles = await query.paginate(perPage(this.query, { perPage: 25, maxPerPage: 100 }))

    return new AdminAccountRoleCollection(roles).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async update() {
    const role = await AccountRole.query().findOrFail(String(this.params.role))
    const data = await this.validate({
      status: 'required|in:active,rejected,suspended',
      note: 'nullable|string|max:191',
    })

    await role.review(this.user, data.status as AccountRoleStatus, data.note)

    return new AdminAccountRoleResource(role).additional({ status: 'success', message: 'Review saved', code: 200 })
  }

  /** Give the role the staff-verified badge, with an optional note on how it was checked. */
  async verify() {
    const role = await AccountRole.query().findOrFail(String(this.params.role))
    const data = await this.validate({ note: 'nullable|string|max:191' })

    await role.verify(this.user, data.note)

    return new AdminAccountRoleResource(role).additional({ status: 'success', message: 'Verified', code: 200 })
  }

  async unverify() {
    const role = await AccountRole.query().findOrFail(String(this.params.role))

    await role.unverify(this.user)

    return new AdminAccountRoleResource(role).additional({ status: 'success', message: 'Verification removed', code: 200 })
  }

  /** The role's reputation history, newest first. */
  async reputation() {
    const role = await AccountRole.query().findOrFail(String(this.params.role))
    const events = await ReputationEvent.query().scope('ofRole', role.id).latest('createdAt').paginate(perPage(this.query, { perPage: 20, maxPerPage: 50 }))

    return new ReputationEventCollection(events).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** Add or take points by hand, with the reason. */
  async adjust() {
    const role = await AccountRole.query().findOrFail(String(this.params.role))
    const data = await this.validate({ points: 'required|integer|min:-10000|max:10000', note: 'required|string|min:3|max:191' })

    await Reputation.adjust(role, this.user, Number(data.points), String(data.note))

    return new AdminAccountRoleResource(await AccountRole.query().findOrFail(role.id)).additional({ status: 'success', message: 'Score corrected', code: 200 })
  }

  /** Accept or turn down the ID photo on its own, such as when it can't be read. */
  async reviewIdentity() {
    const role = await AccountRole.query().findOrFail(String(this.params.role))
    const data = await this.validate({ status: 'required|in:verified,rejected', note: 'nullable|string|max:191' })
    const identity = await IdentityCheck.query().where({ userId: role.userId }).first()

    if (!identity) throw new RequestException('They haven’t sent an ID yet.', 404)

    await identity.review(this.user, data.status as 'verified' | 'rejected', data.note)

    return new AdminAccountRoleResource(role).additional({ status: 'success', message: data.status === 'verified' ? 'ID accepted' : 'ID turned down', code: 200 })
  }
}
