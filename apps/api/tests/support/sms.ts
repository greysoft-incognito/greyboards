import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Texts the API wrote with the log SMS driver, newest last. */
export const texts = (): { to: string; message: string }[] => {
  const file = join(process.cwd(), 'storage/logs/sms.log')

  if (!existsSync(file)) return []

  return readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .slice(-200)
    .map((line) => JSON.parse(line))
}

/** The last text sent to `phone`. */
export const lastText = (phone: string) => [...texts()].reverse().find((sms) => sms.to === phone)?.message ?? ''

/** The six-digit code in the last text to `phone`. */
export const lastCode = (phone: string) => lastText(phone).match(/code is (\d{6})/)?.[1] ?? ''
