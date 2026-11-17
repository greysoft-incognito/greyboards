/**
 * Core domain models, as the API returns them (camelCase keys, ISO dates).
 */

/** Records use UUID primary keys. */
export type ID = string

/** The slug of an account's admin role. `user` (members) and `admin` are built in; admins add others. */
export type UserRole = string

/** Something an admin role can be allowed to do in the admin dashboard. */
export type Permission = 'dashboard.view' | 'users.view' | 'users.manage' | 'partners.review' | 'boards.review' | 'bookings.view' | 'settings.manage' | 'roles.manage' | 'pages.manage'

/** A marketplace role. One account can hold several. */
export type AccountRoleKind = 'advertiser' | 'owner' | 'scout' | 'billposter'

/** Advertisers and owners start active; scouts and billposters start pending until a reviewer decides. */
export type AccountRoleStatus = 'active' | 'pending' | 'rejected' | 'suspended'

/** A marketplace role an account holds. */
export interface AccountRole {
  id: ID
  kind: AccountRoleKind
  label: string
  status: AccountRoleStatus
  /** The reviewer's note, such as why an application was rejected. */
  note: string | null
  reviewedAt: string | null
  createdAt: string
}

/** What a marketplace role is for. */
export interface AccountRoleDefinition {
  kind: AccountRoleKind
  label: string
  description: string
  /** Whether a reviewer checks the account before the role becomes active. */
  needsReview: boolean
}

export interface User {
  id: ID
  name: string
  username: string
  email: string
  emailVerified: boolean
  avatarUrl: string | null
  /** The admin role. Marketplace roles are in `accountRoles`. */
  role: UserRole
  permissions: Permission[]
  accountRoles: AccountRole[]
  createdAt: string
  updatedAt: string
}

export interface AuthToken {
  token: string
  expiresAt: string | null
}

/** A successful sign-in. */
export interface SignedIn extends AuthToken {
  twoFactor: false
  user: User
}

/** The password was right but the account needs an authenticator or recovery code. */
export interface TwoFactorChallenge {
  twoFactor: true
  challengeToken: string
}

export interface TwoFactorStatus {
  enabled: boolean
  enabledAt: string | null
  method: 'authenticator' | 'sms' | null
  recoveryCodesRemaining: number
}

export interface TwoFactorSetup {
  secret: string
  otpauthUrl: string
}

/** A signed-in device. */
export interface Session {
  id: ID
  name: string
  browser: string | null
  os: string | null
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown'
  ipAddress: string | null
  /** True for the device making the request. */
  current: boolean
  lastUsedAt: string | null
  createdAt: string
}
