import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'
import { passChecks } from './support/partner'
import { ark } from './support/ark'

const tokens: Record<string, string> = {}

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: Record<string, unknown>, as: string | null = 'owner') => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

/** A day `days` from today, as 'YYYY-MM-DD'. */
const day = (days: number) => {
  const date = new Date()

  date.setUTCDate(date.getUTCDate() + days)

  return date.toISOString().slice(0, 10)
}

describe('Fixed owner amount', () => {
  const spot = Math.random() / 100
  const board = { kind: 'billboard', widthM: 12, heightM: 4, ratePeriod: 'month', city: 'Kaduna', ownerNet: true }
  let ownBoard = ''

  beforeAll(async () => {
    for (const who of ['owner', 'scout', 'advertiser', 'reviewer']) {
      const email = `owner-net-${who}-${Date.now()}@greyboards.test`
      const roles = who === 'owner' ? ['owner'] : who === 'advertiser' ? ['advertiser'] : ['scout']
      const register = await api('post', '/auth/register', { name: `Owner net ${who}`, email, password: 'password123', roles }, null)

      tokens[who] = register.body.data.token

      if (who === 'reviewer') ark('users:role', email, 'reviewer')
    }

    const scoutRole = (await api('get', '/account/roles', undefined, 'scout')).body.data[0]

    await passChecks(tokens.scout)
    await api('put', `/admin/account-roles/${scoutRole.id}`, { status: 'active' }, 'reviewer')
  }, 60_000)

  it('quotes the listed price that leaves the owner the amount typed', async () => {
    const scouted = await api('get', '/account/boards/owner-price?as=scout&amountMinor=10000000', undefined, 'scout')

    // ₦100,000 / 70% is ₦142,857.14, rounded up to a whole naira.
    expect(scouted.body.data).toEqual({ ownerPercent: 70, listedMinor: 14_285_800 })

    const own = await api('get', '/account/boards/owner-price?as=owner')

    // With no scout, the scout's part goes to the owner.
    expect(own.body.data).toEqual({ ownerPercent: 80, listedMinor: null })
  })

  it('lists the board with the other shares on top of what the owner gets', async () => {
    const tagged = await api('post', '/account/boards', { ...board, name: 'Ahmadu Bello Way', latitude: 10.52 + spot, longitude: 7.44, rateMinor: 10_000_000, as: 'owner' })

    expect(tagged.status).toBe(201)
    expect(tagged.body.data).toMatchObject({ ownerNet: true, ownerRateMinor: 10_000_000, ownerPercent: 80, rate: { amountMinor: 12_500_000 } })

    ownBoard = tagged.body.data.id

    const scouted = await api(
      'post',
      '/account/boards',
      { ...board, name: 'Murtala Square', latitude: 10.51 + spot, longitude: 7.43, rateMinor: 10_000_000, ownerName: 'Malam Sani', ownerPhone: `+23490${String(Date.now()).slice(-8)}`, as: 'scout' },
      'scout',
    )

    expect(scouted.body.data).toMatchObject({ ownerNet: true, ownerRateMinor: 10_000_000, ownerPercent: 70, rate: { amountMinor: 14_285_800 } })
  })

  it('treats a changed rate as the owner’s amount, for the board and for a face', async () => {
    const edited = await api('put', `/account/boards/${ownBoard}`, { rateMinor: 20_000_000 })

    expect(edited.body.data).toMatchObject({ ownerRateMinor: 20_000_000, rate: { amountMinor: 25_000_000 } })

    const face = edited.body.data.rateCard[0]
    const priced = await api('put', `/account/boards/${ownBoard}/faces/${face.id}`, { rateMinor: 4_000_000 })

    expect(priced.body.data.rateCard[0]).toMatchObject({ rateMinor: 5_000_000, ownRateMinor: 5_000_000, ownerRateMinor: 4_000_000 })

    const cleared = await api('put', `/account/boards/${ownBoard}/faces/${face.id}`, { rateMinor: null })

    expect(cleared.body.data.rateCard[0]).toMatchObject({ rateMinor: 25_000_000, ownRateMinor: null, ownerRateMinor: null })
  })

  it('never pays the owner less than their amount, even when the rent comes in lower', async () => {
    await api('put', `/admin/boards/${ownBoard}`, { status: 'listed' }, 'reviewer')

    // As if the owner's percent had gone up since the board was listed: the rent no longer grosses up.
    ark('db', `update boards set rate_minor = 20000000 where id = '${ownBoard}'`)

    const held = (await api('post', `/boards/${ownBoard}/bookings`, { startsOn: day(20), periods: 2 }, 'advertiser')).body.data

    expect(held.amountMinor).toBe(40_000_000)

    const started = (await api('post', `/bookings/${held.id}/checkout`, undefined, 'advertiser')).body.data

    await api('post', `/payments/${started.reference}/verify`, undefined, 'advertiser')

    expect((await api('get', `/bookings/${held.id}`)).body.data.split).toEqual({
      ownerSharePercent: 80,
      ownerAmountMinor: 40_000_000,
      scoutAmountMinor: 0,
      platformAmountMinor: 0,
    })
  })

  it('keeps the listed rate when the fixed amount is turned off', async () => {
    const off = await api('put', `/account/boards/${ownBoard}`, { ownerNet: false })

    expect(off.body.data).toMatchObject({ ownerNet: false, ownerRateMinor: null, rate: { amountMinor: 20_000_000 } })
  })
})
