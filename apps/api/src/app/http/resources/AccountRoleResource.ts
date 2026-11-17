import { AccountRole } from '@app/models/AccountRole'
import { Resource } from 'resora'

/** A marketplace role the account holds, with where its review stands. */
export class AccountRoleResource extends Resource {
  async data() {
    const role = this.resource as AccountRole

    return {
      id: role.id,
      kind: role.kind,
      label: AccountRole.definition(role.kind).label,
      status: role.status,
      note: role.note,
      reviewedAt: role.reviewedAt,
      createdAt: role.createdAt,
    }
  }
}
