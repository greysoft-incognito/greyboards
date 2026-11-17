import { AccountRole } from '@app/models/AccountRole'
import { Role } from '@app/models/Role'
import { User } from '@app/models/User'
import { where } from 'arkormx'

/** Counts for the admin overview: accounts, and the marketplace roles they hold. */
export class AdminOverview {
  static readonly NEW_USER_DAYS = 7

  async summary() {
    const since = new Date(Date.now() - AdminOverview.NEW_USER_DAYS * 24 * 60 * 60 * 1000)
    const accountRoles = Object.fromEntries(
      await Promise.all(
        AccountRole.kinds().map(async (kind) => [
          kind,
          {
            active: await AccountRole.query().where({ kind, status: AccountRole.ACTIVE }).count(),
            pending: await AccountRole.query().where({ kind, status: AccountRole.PENDING }).count(),
          },
        ]),
      ),
    )

    return {
      users: {
        total: await User.query().count(),
        new: await User.query()
          .where(where('createdAt', '>=', since))
          .count(),
        suspended: await User.query().whereNotNull('suspendedAt').count(),
        staff: await User.query().where(where('role', '<>', Role.MEMBER)).count(),
      },
      accountRoles,
      newUserDays: AdminOverview.NEW_USER_DAYS,
      recentUsers: (await User.query().latest('createdAt').take(5).get()).all(),
    }
  }
}
