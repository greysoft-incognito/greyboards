import { Model } from '@arkstack/database'
import { abortIf } from '@arkstack/common'
import type { QueryBuilder } from 'arkormx'
import { matches } from '@app/support/search'
import { PhoneCode } from '@app/support/PhoneCode'
import { Sms } from '@app/support/Sms'
import { AccountRole } from './AccountRole'
import { Board } from './Board'
import { User } from './User'

/**
 * A board owner, with or without an account. Scouts create one the first time they tag
 * an owner's board, so owners who aren't on Greyboards can still be texted and paid.
 * The owner claims it later by proving the phone number. The account that holds a
 * profile manages it, and one account can hold several.
 */
export class OwnerProfile extends Model {
  declare id: string
  declare name: string
  declare phone: string | null
  declare userId: string | null
  declare createdById: string | null
  declare claimedAt: Date | null
  declare phoneVerifiedAt: Date | null
  declare createdAt: Date
  declare updatedAt: Date

  /** Suggestions shown while typing an owner's name. */
  static readonly SUGGESTIONS = 8

  protected static override table = 'owner_profiles'

  protected static override columns = {
    userId: 'user_id',
    createdById: 'created_by_id',
    claimedAt: 'claimed_at',
    phoneVerifiedAt: 'phone_verified_at',
  }

  /** The profile for `phone`, or a new one `creator` makes for an owner who isn't on Greyboards yet. */
  static async findOrCreate(creator: User, name: string, phone: string): Promise<OwnerProfile> {
    const normalized = Sms.normalize(phone)
    const existing = await OwnerProfile.query().where({ phone: normalized }).first()

    if (existing) return existing

    return OwnerProfile.query().create({ name: name.trim() || 'Board owner', phone: normalized, createdById: creator.id })
  }

  /** The account's own profile, made from its name the first time it is needed. */
  static async personal(user: User): Promise<OwnerProfile> {
    const held = await OwnerProfile.query().where({ userId: user.id }).oldest('createdAt').first()

    if (held) return held

    return OwnerProfile.query().create({ name: user.name, userId: user.id, createdById: user.id, claimedAt: new Date() })
  }

  /** A profile `user` manages, or a 404. */
  static async managedBy(user: User, id: string): Promise<OwnerProfile> {
    const profile = await OwnerProfile.query().where({ id, userId: user.id }).first()

    abortIf(!profile, 'Owner profile not found.', 404)

    return profile!
  }

  /** The code that proves `phone` belongs to whoever is claiming its profile. */
  static claimCode(phone: string): PhoneCode {
    return new PhoneCode(phone, 'claim-owner')
  }

  /** Text a code to the number of an unclaimed profile, so its owner can claim it. */
  static async startClaim(phone: string): Promise<OwnerProfile> {
    const profile = await OwnerProfile.query().where({ phone: Sms.normalize(phone) }).whereNull('userId').first()

    abortIf(!profile, 'We couldn’t find any boards listed with this number.', 404)

    await OwnerProfile.claimCode(phone).send((code) => `Your Greyboards code is ${code}. Use it to manage your boards. Don't share it.`)

    return profile!
  }

  /** Hand the unclaimed profile for `phone` to `user`, once the texted code checks out. */
  static async finishClaim(user: User, phone: string, code: string): Promise<OwnerProfile> {
    const profile = await OwnerProfile.query().where({ phone: Sms.normalize(phone) }).whereNull('userId').first()

    abortIf(!profile, 'We couldn’t find any boards listed with this number.', 404)

    await OwnerProfile.claimCode(phone).verify(code)
    await profile!.update({ userId: user.id, claimedAt: new Date(), phoneVerifiedAt: new Date() })
    await AccountRole.take(user, 'owner')

    return profile!
  }

  user() {
    return this.belongsTo(User, 'userId')
  }

  boards() {
    return this.hasMany(Board, 'ownerProfileId')
  }

  /** Profiles whose name or phone number contains `text`. */
  scopeMatching(query: QueryBuilder<OwnerProfile>, text: string): QueryBuilder<OwnerProfile> {
    const digits = text.replace(/\D/g, '')

    return query.where((match: QueryBuilder<OwnerProfile>) => {
      match.where(matches('name', text))

      if (digits.length >= 4) match.orWhere(matches('phone', digits))

      return match
    })
  }

  isClaimed(): boolean {
    return !!this.userId
  }

  /** Whether `user` manages this profile. */
  isManagedBy(user: User | null): boolean {
    return !!user && this.userId === user.id
  }

  /**
   * Whether `user` sets where this owner is paid: the owner once they've claimed the profile,
   * else the scout who made it and runs the boards for them.
   */
  takesPayoutsFor(user: User): boolean {
    return this.userId ? this.userId === user.id : this.createdById === user.id
  }

  /** The number with most digits hidden, for people who don't manage the profile. */
  maskedPhone(): string | null {
    return this.phone ? Sms.mask(this.phone) : null
  }
}
