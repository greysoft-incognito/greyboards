import { AccountRole } from '@app/models/AccountRole'
import { Reputation } from '@app/services/Reputation'
import { Resource } from 'resora'

/** A marketplace role the account holds, with where its review stands and its reputation. */
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
      reputation: {
        ...Reputation.standingOf(role),
        actions: Number(role.reputationActions ?? 0),
        verifiedAt: role.verifiedAt,
        provenAt: role.provenAt,
        progress: await Reputation.progress(role),
      },
      createdAt: role.createdAt,
    }
  }
}
