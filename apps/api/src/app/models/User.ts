import { Auth, User as BaseUser } from '@arkstack/auth'
import { Hash } from '@arkstack/common'
import { PasswordReset } from './PasswordReset'
import { PersonalAccessToken } from './PersonalAccessToken'
import { Storage } from '@arkstack/filesystem'
import { UserNotification } from './UserNotification'
import { UserTwoFactor } from './UserTwoFactor'
import { UserFactory } from 'src/database/factories/UserFactory'
import { AccountMail } from '@app/notifications/AccountMail'
import { ImageFile } from '@app/support/ImageFile'
import { UUID_PATTERN } from '@app/support/rules'
import type { QueryBuilder } from 'arkormx'
import { matches } from '@app/support/search'
import { randomBytes, randomUUID } from 'node:crypto'
import type { PermissionName } from '@app/policies/Permission'
import { Role } from './Role'
import { AccountRole, type AccountRoleKind } from './AccountRole'

/** An uploaded file as the upload middleware hands it over. */
export interface UploadedFile {
  buffer: Buffer
  mimetype: string
  originalname?: string
  size?: number
}

export class User extends BaseUser {
  declare email: string
  declare password: string
  declare name: string
  declare username: string
  declare emailVerifiedAt: Date | null
  declare avatarPath: string | null
  declare avatarDisk: string | null
  /** Running totals of the ratings boards' sides gave this account as an advertiser. */
  declare advertiserRatingSum: number
  declare advertiserRatingCount: number
  /** The slug of the user's admin role. Marketplace roles live in `accountRoles`. */
  declare role: string
  declare suspendedAt: Date | null
  declare createdAt: Date
  declare updatedAt: Date

  protected static override factoryClass = UserFactory

  protected static override columns = {
    emailVerifiedAt: 'email_verified_at',
    avatarPath: 'avatar_path',
    avatarDisk: 'avatar_disk',
    advertiserRatingSum: 'advertiser_rating_sum',
    advertiserRatingCount: 'advertiser_rating_count',
    suspendedAt: 'suspended_at',
  }

  protected override hidden = ['password']

  /** The stored form of an email address: trimmed and lower case. Anything else is returned as given for validation to reject. */
  static normalizeEmail<T>(value: T): T | string {
    return typeof value === 'string' ? value.trim().toLowerCase() : value
  }

  /** A username made from the part of `email` before the @ that nobody uses yet. */
  static async freeUsername(email: string): Promise<string> {
    const name = str(email.normalize('NFKD'))
      .before('@')
      .replaceMatches('/[\u0300-\u036f]+/', '')
      .replaceMatches('/[^A-Za-z0-9]+/', ' ')
      .slug('_')
      .limit(24, '')
      .rtrim('_')
      .toString()
    const base = name.length >= 3 ? name : `user${name ? `_${name}` : ''}`

    let username = base

    while (await User.query().where({ username }).exists()) username = `${base}_${randomBytes(2).toString('hex')}`

    return username
  }

  /** The account `handle` names: its id, email address or username. */
  static async lookup(handle: string): Promise<User | null> {
    const value = handle.trim()

    if (UUID_PATTERN.test(value)) return User.query().find(value)

    return User.query()
      .where(value.includes('@') ? { email: User.normalizeEmail(value) } : { username: value.toLowerCase() })
      .first()
  }

  /** Accounts whose name, email address or username contains `text`. */
  scopeMatching(query: QueryBuilder<User>, text: string): QueryBuilder<User> {
    return query.where((match: QueryBuilder<User>) =>
      match
        .where(matches('name', text))
        .orWhere(matches('email', text))
        .orWhere(matches('username', text)),
    )
  }

  /** The marketplace roles the account holds: advertiser, owner, scout or dispatcher. */
  accountRoles() {
    return this.hasMany(AccountRole, 'userId')
  }

  /** Whether the account may act as `kind` now: it holds that role and it is active. */
  async actsAs(kind: AccountRoleKind): Promise<boolean> {
    return this.accountRoles().where({ kind, status: AccountRole.ACTIVE }).exists()
  }

  personalAccessTokens() {
    return this.hasMany(PersonalAccessToken, 'userId')
  }

  twoFactor() {
    return this.hasOne(UserTwoFactor, 'userId')
  }

  notifications() {
    return this.hasMany(UserNotification, 'userId')
  }

  /** What the user's role allows in the admin dashboard. */
  permissions(): Promise<PermissionName[]> {
    return Role.permissionsFor(this.role)
  }

  async can(permission: PermissionName): Promise<boolean> {
    return (await this.permissions()).includes(permission)
  }

  isSuspended(): boolean {
    return !!this.suspendedAt
  }

  /** Stop the account signing in and sign out every device. */
  async suspend(): Promise<void> {
    if (this.isSuspended()) return

    await this.update({ suspendedAt: new Date() })
    await this.signOutOtherSessions()
  }

  async reinstate(): Promise<void> {
    if (!this.isSuspended()) return

    await this.update({ suspendedAt: null })
  }

  checkPassword(password: string): Promise<boolean> {
    return Hash.verify(password, this.password)
  }

  hasVerifiedEmail(): boolean {
    return !!this.emailVerifiedAt
  }

  /** Email a link that proves this user owns their current address. */
  async sendVerificationEmail(): Promise<void> {
    const token = await Auth.make().createTemporaryToken(this as never, `verify-email:${this.email}`, '24h')
    const query = new URLSearchParams({ token })

    await AccountMail.verifyEmail(this, `${config('app.frontend_url')}/verify-email?${query}`)
  }

  /** The user a verification link was sent to, while the link is valid and the address unchanged. */
  static async fromVerificationToken(token: string, email?: string | null): Promise<User | null> {
    email ||= User.verificationTokenEmail(token)

    if (!email) return null

    const user = (await Auth.make()
      .authorizeTemporaryToken(token, `verify-email:${email}`)
      .catch(() => null)) as User | null

    return user?.email === email ? user : null
  }

  /** The `email` claim of a verification token, read before its signature is verified. */
  private static verificationTokenEmail(token: string): string | null {
    try {
      const claims = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'))

      return typeof claims?.email === 'string' ? claims.email : null
    } catch {
      return null
    }
  }

  async markEmailVerified(): Promise<void> {
    if (this.hasVerifiedEmail()) return

    await this.update({ emailVerifiedAt: new Date() })
  }

  /** Move the account to a new address, which then needs verifying again. */
  async changeEmail(email: string): Promise<void> {
    const previous = this.email

    await this.update({ email, emailVerifiedAt: null })

    await AccountMail.emailChanged(this, previous).catch(() => undefined)
    await this.sendVerificationEmail()
  }

  /** Set a new password and sign out every session except `keepToken`. */
  async changePassword(password: string, keepToken?: string | null): Promise<void> {
    await this.update({ password: await Hash.make(password) })
    await this.signOutOtherSessions(keepToken)
    await PasswordReset.query().where({ email: this.email }).delete()

    await AccountMail.passwordChanged(this).catch(() => undefined)
  }

  /** Revoke every access token but `keepToken`. Returns how many were revoked. */
  async signOutOtherSessions(keepToken?: string | null): Promise<number> {
    const sessions = (await this.personalAccessTokens().getResults()).all().filter((session) => session.token !== keepToken)

    for (const session of sessions) await session.delete()

    return sessions.length
  }


  /** Signed URL of the profile photo. Only its path is stored. */
  async avatarUrl(): Promise<string | null> {
    if (!this.avatarPath || !this.avatarDisk) return null

    return Storage.disk(this.avatarDisk as never).getSignedUrl(this.avatarPath, { expiresIn: '6h' })
  }

  async setAvatar(file: UploadedFile): Promise<void> {
    const disk = ImageFile.disk()
    const mimeType = ImageFile.read(file.buffer)?.mimeType ?? file.mimetype
    const path = `avatars/${this.id}/${randomUUID()}.${ImageFile.extension(mimeType)}`

    await Storage.disk(disk as never).put(path, new Uint8Array(file.buffer))
    await this.removeAvatar()
    await this.update({ avatarPath: path, avatarDisk: disk })
  }

  async removeAvatar(): Promise<void> {
    if (!this.avatarPath || !this.avatarDisk) return

    await Storage.disk(this.avatarDisk as never)
      .delete(this.avatarPath)
      .catch(() => undefined)
    await this.update({ avatarPath: null, avatarDisk: null })
  }

  /** Delete the account and the files it owns. */
  async remove(): Promise<void> {
    await User.transaction(async () => {
      await (await this.personalAccessTokens().getQuery()).delete()
      await PasswordReset.query().where({ email: this.email }).delete()
      await this.delete()
    })

    if (this.avatarPath && this.avatarDisk) {
      await Storage.disk(this.avatarDisk as never)
        .delete(this.avatarPath)
        .catch(() => undefined)
    }
  }
}
