import { createHash, randomBytes } from 'node:crypto'
import { abortIf } from '@arkstack/common'
import { ApiKey, type ApiAbility } from '@app/models/ApiKey'
import { User } from '@app/models/User'
import { Settings } from '@app/support/Settings'
import { Throttle } from '@app/support/Throttle'

/**
 * Keys for the public API. An account makes a key, names it and picks what it may do; the
 * key shows once. Requests sign in with `Authorization: Bearer gbk_…` and count against the
 * key's limit each minute.
 */
export class ApiKeys {
  static async create(user: User, name: string, abilities: ApiAbility[]): Promise<{ key: ApiKey; token: string }> {
    abortIf(!(await Settings.get('public_api.enabled')), 'The public API is switched off right now.', 422)

    const most = await Settings.number('public_api.max_keys')
    const live = await ApiKey.query().where({ userId: user.id }).whereNull('revokedAt').count()

    abortIf(live >= most, `An account can have up to ${most} keys. Remove one first.`, 422)

    const token = `gbk_${randomBytes(24).toString('base64url')}`
    const key = await ApiKey.query().create({
      userId: user.id,
      name: name.trim(),
      prefix: token.slice(0, 10),
      tokenHash: ApiKeys.hash(token),
      abilities: [...new Set(abilities.length ? abilities : ['read'])],
    })

    return { key, token }
  }

  static async revoke(user: User, id: string): Promise<ApiKey> {
    const key = await ApiKey.query().where({ id, userId: user.id }).whereNull('revokedAt').first()

    abortIf(!key, 'Key not found.', 404)

    await key!.update({ revokedAt: new Date() })

    return key!
  }

  /**
   * The account behind a request's key, once the key is live, may do `ability`, and is within
   * its limit for the minute. Refuses otherwise.
   */
  static async authenticate(header: string | undefined, ability: ApiAbility): Promise<{ user: User; key: ApiKey }> {
    abortIf(!(await Settings.get('public_api.enabled')), 'The public API is switched off right now.', 503)

    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : ''
    const key = token.startsWith('gbk_') ? await ApiKey.query().where({ tokenHash: ApiKeys.hash(token) }).whereNull('revokedAt').first() : null

    abortIf(!key, 'Unknown or removed API key.', 401)
    abortIf(!key!.can(ability), `This key can’t ${ability === 'book' ? 'book' : 'read'}. Make a key that can.`, 403)

    const user = await User.query().find(key!.userId)

    abortIf(!user || !!user.suspendedAt, 'This account can’t use the API.', 403)

    const throttle = new Throttle(`api-key:${key!.id}`, await Settings.number('public_api.requests_per_minute'), 60)

    abortIf(await throttle.tooManyAttempts(), 'Too many requests. Wait a minute and try again.', 429)

    await throttle.hit()
    await key!.update({ lastUsedAt: new Date() })

    return { user: user!, key: key! }
  }

  private static hash(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }
}
