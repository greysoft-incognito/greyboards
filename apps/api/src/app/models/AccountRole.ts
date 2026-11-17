import { Model } from '@arkstack/database'
import type { QueryBuilder } from 'arkormx'
import { abortIf } from '@arkstack/common'
import { AccountMail } from '@app/notifications/AccountMail'
import { PartnerChecks } from '@app/services/PartnerChecks'
import { User } from './User'

export type AccountRoleKind = 'advertiser' | 'owner' | 'scout' | 'dispatch'

export type AccountRoleStatus = 'active' | 'pending' | 'rejected' | 'suspended'

export interface AccountRoleDefinition {
  kind: AccountRoleKind
  label: string
  description: string
  /** Whether an admin checks the account before the role becomes active. */
  needsReview: boolean
}

/**
 * A marketplace role an account holds. One account can hold several: an agency can
 * advertise and own boards, a scout can also be a dispatcher. Advertisers and owners
 * start at once; scouts and dispatchers handle other people's boards and money, so an
 * admin reviews them first.
 */
export class AccountRole extends Model {
  declare id: string
  declare userId: string
  declare kind: AccountRoleKind
  declare status: AccountRoleStatus
  declare note: string | null
  declare reviewedById: string | null
  declare reviewedAt: Date | null
  declare createdAt: Date
  declare updatedAt: Date

  static readonly ACTIVE: AccountRoleStatus = 'active'
  static readonly PENDING: AccountRoleStatus = 'pending'
  static readonly REJECTED: AccountRoleStatus = 'rejected'
  static readonly SUSPENDED: AccountRoleStatus = 'suspended'

  static readonly STATUSES: AccountRoleStatus[] = ['active', 'pending', 'rejected', 'suspended']

  /** Every marketplace role, in the order the apps offer them. */
  static readonly DEFINITIONS: AccountRoleDefinition[] = [
    { kind: 'advertiser', label: 'Advertiser', description: 'Find boards anywhere, book them and track campaigns.', needsReview: false },
    { kind: 'owner', label: 'Board owner', description: 'List your own boards, set rates and get paid.', needsReview: false },
    { kind: 'scout', label: 'Scout', description: 'Find boards, sign their owners and run the boards for them.', needsReview: true },
    { kind: 'dispatch', label: 'Dispatch', description: 'Print booked artwork and put it up on boards near you.', needsReview: true },
  ]

  protected static override table = 'account_roles'

  protected static override columns = {
    userId: 'user_id',
    reviewedById: 'reviewed_by_id',
    reviewedAt: 'reviewed_at',
  }

  static kinds(): AccountRoleKind[] {
    return AccountRole.DEFINITIONS.map((definition) => definition.kind)
  }

  static definition(kind: AccountRoleKind): AccountRoleDefinition {
    return AccountRole.DEFINITIONS.find((definition) => definition.kind === kind)!
  }

  /** Give `user` the role `kind`, or send it for review. Taking a role again after a rejection asks for a new review. */
  static async take(user: User, kind: AccountRoleKind): Promise<AccountRole> {
    const status = AccountRole.definition(kind).needsReview ? AccountRole.PENDING : AccountRole.ACTIVE
    const held = await AccountRole.query().where({ userId: user.id, kind }).first()

    if (!held) return AccountRole.query().create({ userId: user.id, kind, status })

    abortIf(held.status === AccountRole.SUSPENDED, `Your ${held.label()} role is suspended. Contact support to restore it.`, 422)

    if (held.status === AccountRole.REJECTED) await held.update({ status, note: null, reviewedById: null, reviewedAt: null })

    return held
  }

  user() {
    return this.belongsTo(User, 'userId')
  }

  reviewer() {
    return this.belongsTo(User, 'reviewedById')
  }

  scopeOfKind(query: QueryBuilder<AccountRole>, kind: AccountRoleKind): QueryBuilder<AccountRole> {
    return query.where({ kind })
  }

  scopeWithStatus(query: QueryBuilder<AccountRole>, status: AccountRoleStatus): QueryBuilder<AccountRole> {
    return query.where({ status })
  }

  label(): string {
    return AccountRole.definition(this.kind).label.toLowerCase()
  }

  /** The label with its article, such as "an advertiser". */
  named(): string {
    return `${/^[aeiou]/i.test(this.label()) ? 'an' : 'a'} ${this.label()}`
  }

  isActive(): boolean {
    return this.status === AccountRole.ACTIVE
  }

  /** Record an admin's decision and email it to the account. Only active, rejected or suspended are decisions. */
  async review(reviewer: User, status: AccountRoleStatus, note?: string | null): Promise<void> {
    abortIf(status === AccountRole.PENDING, 'Pick active, rejected or suspended.', 422)
    abortIf(reviewer.id === this.userId, 'You cannot review your own role.', 422)

    const user = await this.user().first()

    if (status === AccountRole.ACTIVE && AccountRole.definition(this.kind).needsReview && user) await PartnerChecks.approve(user, reviewer)

    await this.update({ status, note: note?.trim() || null, reviewedById: reviewer.id, reviewedAt: new Date() })

    if (user) await AccountMail.roleReviewed(user, this)?.catch(() => undefined)
  }

  /** Suspend the role without a reviewer, such as after too many missed print jobs, and tell the account. */
  async suspend(note: string): Promise<void> {
    if (this.status === AccountRole.SUSPENDED) return

    await this.update({ status: AccountRole.SUSPENDED, note, reviewedById: null, reviewedAt: new Date() })

    const user = await this.user().first()

    if (user) await AccountMail.roleReviewed(user, this)?.catch(() => undefined)
  }

  /** Give the role up. A suspended role stays so it can't be taken again to clear the suspension. */
  async drop(): Promise<void> {
    abortIf(this.status === AccountRole.SUSPENDED, `Your ${this.label()} role is suspended, so it can't be removed.`, 422)

    await this.delete()
  }
}
