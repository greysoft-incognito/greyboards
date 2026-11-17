import { AccountRole, type AccountRoleKind } from '@app/models/AccountRole'
import { AccountRoleCollection } from '@app/http/resources/AccountRoleCollection'
import { AccountRoleResource } from '@app/http/resources/AccountRoleResource'
import { BaseController } from './BaseController'
import { GenericResource } from 'resora'
import { assertFound } from '@arkstack/common'

/** The marketplace roles the signed-in account holds, and taking on or giving up one. */
export default class AccountRoleController extends BaseController {
  /** What each role is for. Works signed out, for sign-up forms. */
  async definitions() {
    return new GenericResource(AccountRole.DEFINITIONS).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async index() {
    const roles = (await this.user.accountRoles().getResults()).all()

    return new AccountRoleCollection(roles).additional({ status: 'success', message: 'OK', code: 200, definitions: AccountRole.DEFINITIONS })
  }

  async create() {
    const data = await this.validate({ kind: `required|in:${AccountRole.kinds().join(',')}` })
    const role = await AccountRole.take(this.user, data.kind as AccountRoleKind)
    const message = role.isActive() ? `You can work as ${role.named()} now` : `Thanks. We'll review your ${role.label()} application.`

    return new AccountRoleResource(role).additional({ status: 'success', message, code: 200 })
  }

  async destroy() {
    const role = await this.user.accountRoles().where({ kind: String(this.params.kind) as AccountRoleKind }).first()

    assertFound(role, 'You do not hold this role.', 404)

    await role.drop()

    return new GenericResource({ kind: role.kind }).additional({ status: 'success', message: `You no longer work as ${role.named()}`, code: 200 })
  }
}
