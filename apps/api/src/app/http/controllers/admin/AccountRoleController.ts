import { AccountRole, type AccountRoleKind, type AccountRoleStatus } from '@app/models/AccountRole'
import { AdminAccountRoleCollection } from '@app/http/resources/AdminAccountRoleCollection'
import { AdminAccountRoleResource } from '@app/http/resources/AdminAccountRoleResource'
import { BaseController } from '../BaseController'
import { perPage } from '@arkstack/common'

/** Reviewers approve, reject or suspend the scouts and billposters who apply. */
export default class AccountRoleController extends BaseController {
  async index() {
    const filters = await this.validateQuery({
      kind: `nullable|in:${AccountRole.kinds().join(',')}`,
      status: `nullable|in:${AccountRole.STATUSES.join(',')}`,
    })

    const query = AccountRole.query()

    if (filters.kind) query.scope('ofKind', filters.kind as AccountRoleKind)
    if (filters.status) query.scope('withStatus', filters.status as AccountRoleStatus)

    const roles = await query.oldest('createdAt').paginate(perPage(this.query, { perPage: 25, maxPerPage: 100 }))

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
}
