import type { AccountRole, AccountRoleKind, AccountRoleStatus, ID, Permission, UserRole } from './models'
import type { PageQuery } from './api'
import type { PartnerChecks } from './partners'

/** Limits the API enforces that apps can check before sending anything. */
export interface AppLimits {
  maxImageMb: number
  maxAvatarMb: number
  registrationOpen: boolean
}

/** Used when the API can't be reached; the API still enforces its own limits. */
export const DEFAULT_LIMITS: AppLimits = { maxImageMb: 25, maxAvatarMb: 10, registrationOpen: true }

/** An account as admins see it. */
export interface AdminUser {
  id: ID
  name: string
  email: string
  emailVerified: boolean
  avatarUrl: string | null
  role: UserRole
  suspended: boolean
  suspendedAt: string | null
  createdAt: string
}

export interface AdminUserQuery extends PageQuery {
  q?: string
  role?: UserRole
  status?: 'active' | 'suspended'
}

/** Counts on the admin overview. */
export interface AdminOverview {
  users: { total: number; new: number; suspended: number; staff: number }
  /** Active and pending holders of each marketplace role. */
  accountRoles: Record<AccountRoleKind, { active: number; pending: number }>
  /** How many days count as new for `users.new`. */
  newUserDays: number
  recentUsers: AdminUser[]
}

/** An account for its admin page. */
export interface AdminUserDetail extends AdminUser {
  accountRoles: AccountRole[]
}

/** A marketplace role as reviewers see it, with the account that holds it. */
export interface AdminAccountRole extends AccountRole {
  user: AdminUser | null
  /** For scouts and billposters: their ID and bank account. */
  checks: PartnerChecks | null
}

export interface AdminAccountRoleQuery extends PageQuery {
  kind?: AccountRoleKind
  status?: AccountRoleStatus
}

/** A reviewer's decision on a marketplace role. */
export interface AccountRoleReview {
  status: Exclude<AccountRoleStatus, 'pending'>
  note?: string | null
}

export type SettingType = 'number' | 'boolean' | 'select' | 'text'

/** One app setting admins can change. Until it is saved, `value` is the `.env` default. */
export interface SettingField {
  name: string
  /** The env variable its default comes from. */
  env: string | null
  type: SettingType
  label: string
  help: string | null
  unit: string | null
  min: number | null
  max: number | null
  options: { value: string; label: string }[] | null
  value: number | boolean | string
  default: number | boolean | string
  /** Whether an admin saved a value that overrides the default. */
  saved: boolean
}

/** Settings shown together on one form. */
export interface SettingGroup {
  id: string
  title: string
  description: string
  /** A Lucide icon name for the group's list entry. */
  icon: string
  fields: SettingField[]
}

/** A named collection of permissions accounts are given. */
export interface Role {
  id: ID
  slug: UserRole
  name: string
  description: string | null
  permissions: Permission[]
  /** Built-in roles (members and admins) can't be changed or deleted. */
  system: boolean
  userCount: number
  createdAt: string
  updatedAt: string
}

/** A permission there is to choose from when making a role. */
export interface PermissionDefinition {
  name: Permission
  label: string
  description: string
}

export interface RoleInput {
  name: string
  slug?: string | null
  description?: string | null
  permissions: Permission[]
}
