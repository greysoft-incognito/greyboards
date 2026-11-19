import { AccountRole } from '@app/models/AccountRole'
import { PartnerChecks } from '@app/services/PartnerChecks'
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
      missing: await AccountRoleResource.missing(role),
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

  /** What the account still has to send before a waiting application can be approved. */
  private static async missing(role: AccountRole) {
    if (role.status !== AccountRole.PENDING || !AccountRole.definition(role.kind).needsReview) return []

    const user = await role.user().first()

    return user ? PartnerChecks.missingFor(user) : []
  }
}
