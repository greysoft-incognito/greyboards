import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import { lastCode, lastText } from './support/sms'
import { execFileSync } from 'node:child_process'
import request from 'parasito'

const tokens: Record<string, string> = {}

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: Record<string, unknown>, as: string | null = 'advertiser') => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

const sql = (statement: string) => execFileSync('npx', ['ark', 'db', statement], { cwd: process.cwd(), encoding: 'utf8' })

/** A day `days` from today, as 'YYYY-MM-DD'. */
const day = (days: number) => {
  const date = new Date()

  date.setUTCDate(date.getUTCDate() + days)

  return date.toISOString().slice(0, 10)
}

describe('Bookings', () => {
  const phone = `+23470${String(Date.now()).slice(-8)}`
  const spot = Math.random() / 100
  let ownBoard = ''
  let scoutedBoard = ''

  beforeAll(async () => {
    for (const who of ['advertiser', 'rival', 'owner', 'scout', 'reviewer']) {
      const email = `bookings-${who}-${Date.now()}@greyboards.test`
      const roles = who === 'owner' ? ['owner'] : who === 'scout' ? ['scout'] : ['advertiser']
      const register = await api('post', '/auth/register', { name: `Bookings ${who}`, email, password: 'password123', roles }, null)

      if (!register.body.data) throw new Error(JSON.stringify(register.body).slice(0, 300))
      tokens[who] = register.body.data.token

      if (who === 'reviewer') execFileSync('npx', ['ark', 'users:role', email, 'reviewer'], { cwd: process.cwd(), encoding: 'utf8' })
    }

    const scoutRole = (await api('get', '/account/roles', undefined, 'scout')).body.data[0]

    await api('put', `/admin/account-roles/${scoutRole.id}`, { status: 'active' }, 'reviewer')

    const board = { kind: 'billboard', widthM: 12, heightM: 4, rateMinor: 100_000_000, ratePeriod: 'month', city: 'Abuja' }

    ownBoard = (await api('post', '/account/boards', { ...board, name: 'Wuse II', latitude: 9.07 + spot, longitude: 7.47, as: 'owner' }, 'owner')).body.data.id
    scoutedBoard = (await api('post', '/account/boards', { ...board, name: 'Garki gate', latitude: 9.03 + spot, longitude: 7.49, ownerName: 'Alhaji Musa', ownerPhone: phone, as: 'scout' }, 'scout')).body
      .data.id

    for (const id of [ownBoard, scoutedBoard]) await api('put', `/admin/boards/${id}`, { status: 'listed' }, 'reviewer')
  }, 90_000)

  it('holds dates for whole months of the rate, after the notice period', async () => {
    expect((await api('post', `/boards/${ownBoard}/bookings`, { startsOn: day(1), periods: 1 })).status).toBe(422)
    expect((await api('post', `/boards/${ownBoard}/bookings`, { startsOn: day(10), periods: 13 })).status).toBe(422)
    expect((await api('post', `/boards/${ownBoard}/bookings`, { startsOn: day(10), periods: 1 }, 'owner')).status).toBe(403)

    expect((await api('get', `/boards/${ownBoard}`)).body.data.booking).toMatchObject({ open: true, maxPeriods: 12, printFeeMinor: 16_800_000 })

    const held = await api('post', `/boards/${ownBoard}/bookings`, { startsOn: '2027-01-31', periods: 2 })

    expect(held.status).toBe(201)
    // 12 × 4 m at ₦3,500 per m² to print and post.
    expect(held.body.data).toMatchObject({ status: 'held', startsOn: '2027-01-31', endsOn: '2027-03-30', periods: 2, amountMinor: 216_800_000, printFeeMinor: 16_800_000, split: null })
    expect(held.body.data.holdSecondsLeft).toBeGreaterThan(800)
  })

  it('never lets two bookings share a day, and shows the taken days', async () => {
    expect((await api('post', `/boards/${ownBoard}/bookings`, { startsOn: '2027-03-30', periods: 1 }, 'rival')).status).toBe(409)
    expect((await api('post', `/boards/${ownBoard}/bookings`, { startsOn: '2027-03-31', periods: 1 }, 'rival')).status).toBe(201)

    const taken = await api('get', `/boards/${ownBoard}/availability?from=2027-01-01&to=2027-12-31`, undefined, null)

    expect(taken.body.data).toEqual([
      { startsOn: '2027-01-31', endsOn: '2027-03-30' },
      { startsOn: '2027-03-31', endsOn: '2027-04-30' },
    ])
  })

  it('frees the days when a hold is cancelled or runs out', async () => {
    const held = (await api('post', `/boards/${ownBoard}/bookings`, { startsOn: '2027-06-01', periods: 1 })).body.data

    expect((await api('post', `/boards/${ownBoard}/bookings`, { startsOn: '2027-06-10', periods: 1 }, 'rival')).status).toBe(409)
    expect((await api('post', `/bookings/${held.id}/cancel`, undefined, 'rival')).status).toBe(404)
    expect((await api('post', `/bookings/${held.id}/cancel`)).body.data.status).toBe('cancelled')

    const rival = (await api('post', `/boards/${ownBoard}/bookings`, { startsOn: '2027-06-10', periods: 1 }, 'rival')).body.data

    expect(rival.status).toBe('held')

    sql(`update bookings set hold_expires_at = now() - interval '1 minute' where id = '${rival.id}'`)

    expect((await api('get', `/bookings/${rival.id}`, undefined, 'rival')).body.data.status).toBe('expired')
    expect((await api('post', `/boards/${ownBoard}/bookings`, { startsOn: '2027-06-10', periods: 1 })).status).toBe(201)
    expect((await api('post', `/bookings/${rival.id}/checkout`, undefined, 'rival')).status).toBe(422)
  })

  it('takes payment into escrow and keeps the commission from the owner, apart from printing', async () => {
    const held = (await api('get', '/account/bookings?status=held')).body.data.find((booking: { startsOn: string }) => booking.startsOn === '2027-01-31')
    const started = await api('post', `/bookings/${held.id}/checkout`)

    expect(started.status).toBe(201)
    expect(started.body.data.checkoutUrl).toContain(`/checkout/complete?reference=${started.body.data.reference}`)
    expect((await api('post', `/payments/${started.body.data.reference}/verify`, undefined, 'rival')).status).toBe(404)

    const paid = await api('post', `/payments/${started.body.data.reference}/verify`)

    expect(paid.body.data.status).toBe('complete')

    const booking = (await api('get', `/bookings/${held.id}`)).body.data

    expect(booking).toMatchObject({ status: 'paid', split: null, holdSecondsLeft: null })
    expect((await api('get', `/bookings/${held.id}`, undefined, 'owner')).body.data.split).toEqual({
      ownerSharePercent: 85,
      ownerAmountMinor: 170_000_000,
      scoutAmountMinor: 0,
      platformAmountMinor: 30_000_000,
    })
    expect((await api('get', '/account/board-bookings', undefined, 'owner')).body.data.map((entry: { id: string }) => entry.id)).toContain(held.id)
    expect((await api('post', `/bookings/${held.id}/cancel`)).status).toBe(422)
    expect(sql(`select account, kind, amount_minor from ledger_entries where booking_id = '${held.id}'`)).toMatch(/escrow\s*\|\s*payment_in\s*\|\s*216800000/)
  })

  it('books scouted boards only once the owner signs, and pays the scout from the commission', async () => {
    expect((await api('post', `/boards/${scoutedBoard}/bookings`, { startsOn: day(20), periods: 1 })).status).toBe(422)

    await api('post', `/account/boards/${scoutedBoard}/agreement`, undefined, 'scout')

    const token = lastText(phone).match(/\/agreements\/([\w-]+)/)?.[1]

    await api('post', `/agreements/${token}/code`, undefined, null)
    await api('post', `/agreements/${token}/sign`, { name: 'Musa Bello', code: lastCode(phone) }, null)

    const held = (await api('post', `/boards/${scoutedBoard}/bookings`, { startsOn: day(20), periods: 1 })).body.data
    const started = (await api('post', `/bookings/${held.id}/checkout`)).body.data

    await api('post', `/payments/${started.reference}/verify`)

    expect((await api('get', `/bookings/${held.id}`, undefined, 'scout')).body.data.split).toEqual({
      ownerSharePercent: 70,
      ownerAmountMinor: 70_000_000,
      scoutAmountMinor: 9_000_000,
      platformAmountMinor: 21_000_000,
    })
    expect(lastText(phone)).toContain('Your board "Garki gate" is booked')
    expect(lastText(phone)).toContain('receive ₦700,000 after the ad is up')
  })
})
