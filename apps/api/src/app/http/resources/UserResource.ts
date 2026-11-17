import type { User } from '@app/models/User'
import { AccountRoleResource } from './AccountRoleResource'
import { Resource } from 'resora'

export class UserResource extends Resource {
  async data() {
    const user = this.resource as User
    const accountRoles = (await user.accountRoles().getResults()).all()

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      emailVerified: user.hasVerifiedEmail(),
      avatarUrl: await user.avatarUrl(),
      role: user.role ?? 'user',
      permissions: await user.permissions(),
      accountRoles: await Promise.all(accountRoles.map((role) => new AccountRoleResource(role).data())),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }
}
