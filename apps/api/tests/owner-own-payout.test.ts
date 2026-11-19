import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'
import { ark } from './support/ark'

const tokens: Record<string, string> = {}

const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

const api = (method: 'get' | 'post' | 'put', path: string, body?: Record<string, unknown>, as = 'owner') => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

const upload = (path: string, field: string, as: string, fields: Record<string, number> = {}) => {
  const form = new FormData()

  form.append(field, new Blob([pixel], { type: 'image/png' }), 'image.png')

  for (const [key, value] of Object.entries(fields)) form.append(key, String(value))

  return request(app).post(`/api${path}`).set({ Accept: 'application/json', Authorization: `Bearer ${tokens[as]}` }).send(form)
}

describe('Payouts to an owner who lists their own boards', () => {
  const latitude = 7.5 + Math.random() / 100
  const longitude = 3.95
  let bookingId = ''

  beforeAll(async () => {
    for (const who of ['advertiser', 'owner', 'admin']) {
      const email = `own-payout-${who}-${Date.now()}@greyboards.test`
      const register = await api('post', '/auth/register', { name: `Own payout ${who}`, email, password: 'password123', roles: [who === 'owner' ? 'owner' : 'advertiser'] })

      tokens[who] = register.body.data.token

      if (who === 'admin') ark('users:role', email, 'admin')
    }

    const board = (await api('post', '/account/boards', { name: 'Own payout screen', kind: 'digital', widthM: 6, heightM: 3, latitude, longitude, rateMinor: 20_000_000, as: 'owner' })).body.data

    await api('put', `/admin/boards/${board.id}`, { status: 'listed' }, 'admin')

    const held = (await api('post', `/boards/${board.id}/bookings`, { startsOn: '2027-07-01', periods: 1 }, 'advertiser')).body.data
    const payment = (await api('post', `/bookings/${held.id}/checkout`, undefined, 'advertiser')).body.data

    await api('post', `/payments/${payment.reference}/verify`, undefined, 'advertiser')
    await upload(`/bookings/${held.id}/artwork`, 'artwork', 'advertiser')
    await api('post', `/bookings/${held.id}/artwork/review`, { decision: 'approve' })

    for (const metres of [3, 6]) await upload(`/bookings/${held.id}/proofs`, 'photo', 'owner', { latitude: latitude + metres / 111_320, longitude, accuracyM: 5 })

    await api('post', `/bookings/${held.id}/proof/submit`)
    await api('post', `/bookings/${held.id}/proof/accept`, undefined, 'advertiser')

    bookingId = held.id
    await api('put', '/admin/settings/payouts', { enabled: true, hold_days: 0 }, 'admin')
  }, 120_000)

  afterAll(async () => {
    await api('put', '/admin/settings/payouts', { enabled: null, hold_days: null }, 'admin')
  })

  it('pays their share into their own account when their profile has none', async () => {
    await api('put', '/account/payout-account', { bankCode: '058', accountNumber: '0123456789' })

    const summary = (await api('get', '/account/payouts')).body.data

    expect(summary.owners[0].account).toMatchObject({ bankName: 'GTBank', accountNumber: '••••••6789' })

    ark('payouts:send')

    expect((await api('get', '/account/payouts')).body.data).toMatchObject({ owedMinor: 0, paidMinor: 16_000_000 })
    expect((await api('get', '/account/payouts/history')).body.data[0]).toMatchObject({ bookingId, status: 'paid', bankName: 'GTBank' })
  }, 60_000)
})
