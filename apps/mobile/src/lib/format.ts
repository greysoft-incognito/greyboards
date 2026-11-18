/** An amount in minor units, such as "₦1,200,000". */
export function formatMoney(amountMinor: number, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amountMinor / 100)
}

/** A short amount for map pins, such as "₦850K". */
export function formatCompactMoney(amountMinor: number, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(amountMinor / 100)
}

/** A day such as "31 Jan 2027". Days are calendar days, so they're read in UTC. */
export function formatDay(day: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${day.slice(0, 10)}T00:00:00Z`))
}

/** Both days of a run, such as "31 Jan 2027 to 30 Mar 2027". */
export function formatDays({ startsOn, endsOn }: { startsOn: string; endsOn: string }) {
  return `${formatDay(startsOn)} to ${formatDay(endsOn)}`
}

/** A moment such as "Tue 3 Feb, 2:00 PM" in Nigerian time, where the boards are. */
export function formatMoment(moment: string) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Africa/Lagos' }).format(new Date(moment))
}

/** "350 m" or "2.4 km". */
export function formatDistance(metres: number) {
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(metres < 10_000 ? 1 : 0)} km`
}

/** Whole units typed into a money field, as minor units. */
export function toMinor(value: string) {
  return Math.round(Number(value.replace(/[^\d.]/g, '')) * 100)
}

/** "2 days 4 hours" or "35 minutes" until something runs out. */
export function formatWait(seconds: number) {
  const hours = Math.floor(seconds / 3600)

  if (hours >= 24) return `${plural(Math.floor(hours / 24), 'day')} ${plural(hours % 24, 'hour')}`
  if (hours >= 1) return `${plural(hours, 'hour')} ${plural(Math.floor((seconds % 3600) / 60), 'minute')}`

  return plural(Math.max(1, Math.ceil(seconds / 60)), 'minute')
}

/** "1 month" or "3 weeks". */
export function plural(count: number, unit: string) {
  return `${count} ${unit}${count === 1 ? '' : 's'}`
}
