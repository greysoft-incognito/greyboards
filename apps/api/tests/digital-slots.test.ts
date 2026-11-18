import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'
import { ark } from './support/ark'

const tokens: Record<string, string> = {}

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: Record<string, unknown>, as: string | null = 'advertiser') => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

const player = (method: 'get' | 'post', path: string, token: string, body?: Record<string, unknown>) => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json', Authorization: `Bearer ${token}` })

  return body ? call.send(body) : call
}

const sql = (statement: string) => ark('db', statement)

/** A day `days` from today, as 'YYYY-MM-DD'. */
const day = (days: number) => {
  const date = new Date()

  date.setUTCDate(date.getUTCDate() + days)

  return date.toISOString().slice(0, 10)
}

describe('Digital screens', () => {
  const spot = Math.random() / 100
  const startsOn = day(20)
  let screen = ''
  let first = ''
  let playerToken = ''

  beforeAll(async () => {
    for (const who of ['owner', 'advertiser', 'rival', 'late', 'reviewer']) {
      const email = `digital-${who}-${Date.now()}@greyboards.test`
      const roles = who === 'owner' ? ['owner'] : ['advertiser']
      const register = await api('post', '/auth/register', { name: `Digital ${who}`, email, password: 'password123', roles }, null)

      tokens[who] = register.body.data.token

      if (who === 'reviewer') ark('users:role', email, 'reviewer')
    }

    const tagged = await api(
      'post',
      '/account/boards',
      { name: 'Kawo screen', kind: 'digital', widthM: 8, heightM: 4, latitude: 10.56 + spot, longitude: 7.45, rateMinor: 10_000_000, ratePeriod: 'month', loopSlots: 4, as: 'owner' },
      'owner',
    )

    screen = tagged.body.data.id
    await api('put', `/admin/boards/${screen}`, { status: 'listed' }, 'reviewer')
  }, 60_000)

  it('prices a slot by part of the day from the all-day rate', async () => {
    const slots = await api('get', `/boards/${screen}/slots?startsOn=${startsOn}&periods=1`, undefined, null)

    expect(slots.body.data).toMatchObject({ loop: { slots: 4, seconds: 10 }, freeSlots: 4 })
    expect(slots.body.data.dayparts.map((part: { daypart: string; rateMinor: number }) => [part.daypart, part.rateMinor])).toEqual([
      ['all_day', 10_000_000],
      ['morning', 4_000_000],
      ['afternoon', 3_500_000],
      ['evening', 4_500_000],
    ])
    expect((await api('get', `/boards/${screen}`, undefined, null)).body.data.loop).toEqual({ slots: 4, seconds: 10 })
  })

  it('sells slots in the loop until none are left', async () => {
    const held = await api('post', `/boards/${screen}/bookings`, { startsOn, periods: 1, slots: 3 })

    expect(held.status).toBe(201)
    expect(held.body.data).toMatchObject({ amountMinor: 30_000_000, slots: { start: 0, count: 3, daypart: 'all_day' } })

    first = held.body.data.id

    expect((await api('post', `/boards/${screen}/bookings`, { startsOn, periods: 1, slots: 5 }, 'rival')).status).toBe(422)
    expect((await api('post', `/boards/${screen}/bookings`, { startsOn, periods: 1, slots: 2 }, 'rival')).status).toBe(409)

    const evening = await api('post', `/boards/${screen}/bookings`, { startsOn, periods: 1, slots: 1, daypart: 'evening' }, 'rival')

    expect(evening.body.data).toMatchObject({ amountMinor: 4_500_000, slots: { start: 3, count: 1, daypart: 'evening', hourFrom: 18, hourTo: 24 } })

    // The last slot still has its morning and afternoon free, so the day stays open.
    expect((await api('get', `/boards/${screen}/availability?from=${startsOn}&to=${day(25)}`, undefined, null)).body.data).toEqual([])

    const morning = await api('post', `/boards/${screen}/bookings`, { startsOn, periods: 1, slots: 1, daypart: 'morning' }, 'late')

    expect(morning.body.data.slots).toMatchObject({ start: 3, daypart: 'morning' })
    expect((await api('post', `/boards/${screen}/bookings`, { startsOn, periods: 1, slots: 1, daypart: 'evening' }, 'late')).status).toBe(409)
    expect((await api('get', `/boards/${screen}/slots?startsOn=${startsOn}&periods=1&daypart=afternoon`, undefined, null)).body.data.freeSlots).toBe(1)
  })

  it('keeps the loop big enough for the slots already booked', async () => {
    expect((await api('put', `/account/boards/${screen}`, { loopSlots: 3 }, 'owner')).status).toBe(422)
    expect((await api('put', `/account/boards/${screen}`, { loopSlots: 6 }, 'owner')).body.data).toMatchObject({ loop: { slots: 6 }, ownLoopSlots: 6 })
  })

  it('gives the screen’s player its schedule and logs each play once', async () => {
    const started = (await api('post', `/bookings/${first}/checkout`)).body.data

    await api('post', `/payments/${started.reference}/verify`)
    // As if the run had started: the player only takes plays that already happened.
    sql(`update bookings set artwork_status = 'approved', starts_on = '${day(0)}', ends_on = '${day(29)}' where id = '${first}'`)

    const issued = await api('post', `/account/boards/${screen}/player`, undefined, 'owner')

    expect(issued.status).toBe(201)
    playerToken = issued.body.data.token
    expect(playerToken).toMatch(/^gbp_/)

    expect((await player('get', '/player/schedule', 'gbp_wrong')).status).toBe(401)

    const schedule = await player('get', '/player/schedule', playerToken)

    expect(schedule.body.data.loop).toEqual({ slots: 6, seconds: 10 })
    expect(schedule.body.data.bookings).toEqual([expect.objectContaining({ bookingId: first, slotStart: 0, slots: 3, hourFrom: 0, hourTo: 24 })])

    const playedAt = new Date(Date.now() - 60_000).toISOString()
    const plays = await player('post', '/player/plays', playerToken, {
      plays: [
        { bookingId: first, playedAt, durationMs: 10_000 },
        { bookingId: first, playedAt, durationMs: 10_000 },
        { bookingId: 'not-a-booking', playedAt, durationMs: 10_000 },
        { bookingId: first, playedAt: `${day(400)}T09:00:00.000Z`, durationMs: 10_000 },
      ],
    })

    expect(plays.body.data).toEqual({ accepted: 2, skipped: 2 })
  })

  it('shows the advertiser how often their ad played', async () => {
    const playedAt = new Date(Date.now() - 60_000).toISOString()

    const booking = (await api('get', `/bookings/${first}`)).body.data

    expect(booking.plays).toMatchObject({ total: 1, seconds: 10, days: [{ day: playedAt.slice(0, 10), plays: 1, seconds: 10 }] })
    expect((await api('get', `/boards/${screen}`, undefined, 'owner')).body.data.player).toMatchObject({ connected: true })

    await api('delete', `/account/boards/${screen}/player`, undefined, 'owner')

    expect((await player('get', '/player/schedule', playerToken)).status).toBe(401)
  })
})
