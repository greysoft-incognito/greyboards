import { Arkstack } from '@arkstack/contract'
import { Notification } from '@arkstack/notifications'
import { appendFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export interface SentSms {
  to: string
  message: string
  sentAt: Date
}

/**
 * Text messages to people who may not have an account, such as board owners. The
 * `agreements.sms_driver` config picks Africa's Talking, Twilio, or a log file.
 */
export class Sms {
  /** The latest messages written by the log driver, newest last, for tests and local work. */
  static readonly outbox: SentSms[] = []

  private static readonly OUTBOX_SIZE = 50

  /** `phone` in international form, such as +2348030000000. Local numbers get the default country code. */
  static normalize(phone: string): string {
    const digits = phone.replace(/[^\d+]/g, '')

    if (digits.startsWith('+')) return `+${digits.slice(1).replace(/\D/g, '')}`
    if (digits.startsWith('00')) return `+${digits.slice(2)}`
    if (digits.startsWith('0')) return `+${config('agreements.default_country_code', '234')}${digits.slice(1)}`

    return `+${digits}`
  }

  /** The number with all but its last four digits hidden, such as +234•••••0000. */
  static mask(phone: string): string {
    const normalized = Sms.normalize(phone)

    return `${normalized.slice(0, 4)}${'•'.repeat(Math.max(0, normalized.length - 8))}${normalized.slice(-4)}`
  }

  static async send(phone: string, message: string): Promise<void> {
    const to = Sms.normalize(phone)
    const driver = String(config('agreements.sms_driver', 'log'))

    if (driver === 'log') return Sms.log(to, message)

    await Notification.sms({ transport: driver as 'africastalking' | 'twilio' }).send(message, undefined, to as never)
  }

  private static async log(to: string, message: string): Promise<void> {
    const sent = { to, message, sentAt: new Date() }
    const directory = join(Arkstack.rootDir(), 'storage/logs')

    Sms.outbox.push(sent)
    Sms.outbox.splice(0, Math.max(0, Sms.outbox.length - Sms.OUTBOX_SIZE))

    await mkdir(directory, { recursive: true })
    await appendFile(join(directory, 'sms.log'), `${JSON.stringify(sent)}\n`)
  }
}
