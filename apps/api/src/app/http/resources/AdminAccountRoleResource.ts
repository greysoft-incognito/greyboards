import type { AccountRole } from '@app/models/AccountRole'
import { AccountRoleResource } from './AccountRoleResource'
import { AdminUserResource } from './AdminUserResource'

/** A marketplace role as reviewers see it, with the account that holds it. */
export class AdminAccountRoleResource extends AccountRoleResource {
  async data() {
    const role = this.resource as AccountRole
    const user = await role.user().first()

    return {
      ...(await super.data()),
      user: user ? await new AdminUserResource(user).data() : null,
    }
  }
}
