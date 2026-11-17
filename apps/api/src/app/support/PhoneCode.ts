import { Cache } from '@arkstack/cache'
import { abortIf } from '@arkstack/common'
import { createHash, randomInt, timingSafeEqual } from 'node:crypto'
import { Sms } from './Sms'

/**
 * Six-digit codes texted to a phone number to prove the person holds it, for one
 * `purpose` such as signing an agreement or claiming an owner profile. Codes live in
 * the cache, work for ten minutes, and allow a few wrong guesses.
 */
export class PhoneCode {
  static readonly MINUTES = 10

  static readonly RESEND_SECONDS = 60

  static readonly MAX_ATTEMPTS = 5

  constructor(
    readonly phone: string,
    readonly purpose: string,
  ) {}

  private key(part: string): string {
    return `phone-code:${this.purpose}:${Sms.normalize(this.phone)}:${part}`
  }

  private static hash(code: string): string {
    return createHash('sha256').update(code).digest('hex')
  }

  /** Text a new code, worded by `message`. Asking again within a minute is refused. */
  async send(message: (code: string) => string): Promise<void> {
    const allowed = await Cache.add(this.key('wait'), true, PhoneCode.RESEND_SECONDS)

    abortIf(!allowed, 'Wait a minute before asking for another code.', 429)

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')

    await Cache.put(this.key('code'), PhoneCode.hash(code), PhoneCode.MINUTES * 60)
    await Cache.put(this.key('attempts'), 0, PhoneCode.MINUTES * 60)
    await Sms.send(this.phone, message(code))
  }

  /** Check `code`, and use it up when it is right. Stops with a message when it isn't. */
  async verify(code: string): Promise<void> {
    const stored = (await Cache.get(this.key('code'))) as string | null
    const attempts = Number((await Cache.get(this.key('attempts'))) ?? 0)

    abortIf(!stored, 'Ask for a new code. The last one ran out.', 422)
    abortIf(attempts >= PhoneCode.MAX_ATTEMPTS, 'Too many wrong codes. Ask for a new one.', 429)

    const right = timingSafeEqual(Buffer.from(stored!, 'hex'), Buffer.from(PhoneCode.hash(String(code).trim()), 'hex'))

    if (!right) {
      await Cache.put(this.key('attempts'), attempts + 1, PhoneCode.MINUTES * 60)

      abortIf(true, 'That code isn’t right. Check the text and try again.', 422)
    }

    await Cache.forget(this.key('code'))
    await Cache.forget(this.key('attempts'))
  }
}
