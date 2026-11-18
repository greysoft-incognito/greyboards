import { Model } from '@arkstack/database'
import { User } from './User'

/** What a key may do: `read` boards and the account's bookings, and `book` boards and pay. */
export type ApiAbility = 'read' | 'book'

/** A key an agency's own system uses to reach the public API for an account. */
export class ApiKey extends Model {
  declare id: string
  declare userId: string
  declare name: string
  /** The first characters of the key, so its owner can tell keys apart. */
  declare prefix: string
  declare tokenHash: string
  declare abilities: ApiAbility[]
  declare lastUsedAt: Date | null
  declare revokedAt: Date | null
  declare createdAt: Date
  declare updatedAt: Date

  static readonly ABILITIES: ApiAbility[] = ['read', 'book']

  protected static override table = 'api_keys'

  protected static override columns = {
    userId: 'user_id',
    tokenHash: 'token_hash',
    lastUsedAt: 'last_used_at',
    revokedAt: 'revoked_at',
  }

  protected override casts = {
    abilities: 'json',
  } as never

  user() {
    return this.belongsTo(User, 'userId')
  }

  can(ability: ApiAbility): boolean {
    return (this.abilities ?? []).includes(ability)
  }
}
