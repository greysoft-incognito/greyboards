/** Calendar days as 'YYYY-MM-DD', counted in UTC so they mean the same day everywhere. */
export class Day {
  static readonly PATTERN = /^\d{4}-\d{2}-\d{2}$/

  /** Today, or `days` from today. */
  static today(days = 0): string {
    return Day.addDays(new Date().toISOString().slice(0, 10), days)
  }

  /** A day from a 'YYYY-MM-DD' string or a date column. Postgres hands dates back as local midnight. */
  static of(value: Date | string): string {
    if (typeof value === 'string') return value.slice(0, 10)

    const pad = (part: number) => String(part).padStart(2, '0')

    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
  }

  static addDays(day: string, days: number): string {
    const date = new Date(`${day}T00:00:00Z`)

    date.setUTCDate(date.getUTCDate() + days)

    return date.toISOString().slice(0, 10)
  }

  /** The same day `months` later, or the month's last day when it is shorter (31 Jan + 1 month is 28 Feb). */
  static addMonths(day: string, months: number): string {
    const [year, month, date] = day.split('-').map(Number)
    const target = new Date(Date.UTC(year, month - 1 + months, 1))
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()

    target.setUTCDate(Math.min(date, lastDay))

    return target.toISOString().slice(0, 10)
  }

  /** Whole days from `from` to `to`; negative when `to` is earlier. */
  static between(from: string, to: string): number {
    return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
  }

  static valid(day: string): boolean {
    return Day.PATTERN.test(day) && new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day
  }
}
