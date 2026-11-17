import { AccountRoleResource } from './AccountRoleResource'
import { AdminUserResource } from './AdminUserResource'
import type { User } from '@app/models/User'

/** An account for its admin page, with the marketplace roles it holds. */
export class AdminUserDetailResource extends AdminUserResource {
  async data() {
    const user = this.resource as User
    const accountRoles = (await user.accountRoles().getResults()).all()

    return {
      ...(await super.data()),
      accountRoles: await Promise.all(accountRoles.map((role) => new AccountRoleResource(role).data())),
    }
  }
}
