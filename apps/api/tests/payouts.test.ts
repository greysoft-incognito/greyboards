import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import { execFileSync } from 'node:child_process'
import request from 'parasito'

const tokens: Record<string, string> = {}

const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

const api = (method: 'get' | 'post' | 'put', path: string, body?: Record<string, unknown>, as: string | null = 'owner') => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

const upload = (path: string, field: string, as: string, fields: Record<string, number> = {}) => {
  const form = new FormData()

  form.append(field, new Blob([pixel], { type: 'image/png' }), 'image.png')

  for (const [key, value] of Object.entries(fields)) form.append(key, String(value))

  return request(app).post(`/api${path}`).set({ Accept: 'application/json', Authorization: `Bearer ${tokens[as]}` }).send(form)
}

const ark = (...args: string[]) => execFileSync('npx', ['ark', ...args], { cwd: process.cwd(), encoding: 'utf8' })

describe('Payouts', () => {
  const latitude = 7.4 + Math.random() / 100
  const longitude = 3.9
  let bookingId = ''
  let profileId = ''

  beforeAll(async () => {
    for (const who of ['advertiser', 'owner', 'admin']) {
      const email = `payout-${who}-${Date.now()}@greyboards.test`
      const register = await api('post', '/auth/register', { name: `Payout ${who}`, email, password: 'password123', roles: [who === 'owner' ? 'owner' : 'advertiser'] }, null)

      tokens[who] = register.body.data.token

      if (who === 'admin') ark('users:role', email, 'admin')
    }

    // A digital board needs no print job, so the owner proves it and takes the whole owner's share.
    const board = (await api('post', '/account/boards', { name: 'Payout screen', kind: 'digital', widthM: 6, heightM: 3, latitude, longitude, rateMinor: 20_000_000, as: 'owner' })).body.data

    await api('put', `/admin/boards/${board.id}`, { status: 'listed' }, 'admin')

    const held = (await api('post', `/boards/${board.id}/bookings`, { startsOn: '2027-06-01', periods: 1 }, 'advertiser')).body.data
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

  it('checks bank details with the bank before saving them', async () => {
    const banks = (await api('get', '/banks')).body.data

    expect(banks).toContainEqual({ code: '058', name: 'GTBank' })
    expect((await api('put', '/account/payout-account', { bankCode: '999', accountNumber: '0123456789' })).status).toBe(422)
    expect((await api('put', '/account/payout-account', { bankCode: '058', accountNumber: '0000000000' })).status).toBe(422)
    expect((await api('put', '/account/payout-account', { bankCode: '058', accountNumber: '12345' })).status).toBe(422)

    const saved = await api('put', '/account/payout-account', { bankCode: '058', accountNumber: '0123456789' })

    expect(saved.body.data).toMatchObject({ bankName: 'GTBank', accountNumber: '••••••6789', accountName: 'Test Account Holder' })
  })

  it('pays the owner’s share into their profile’s account, and lets staff send a failed one again', async () => {
    const summary = (await api('get', '/account/payouts')).body.data

    expect(summary).toMatchObject({ enabled: true, owedMinor: 17_000_000, paidMinor: 0 })
    expect(summary.owners).toHaveLength(1)

    profileId = summary.owners[0].profileId

    expect((await api('put', `/account/owner-profiles/${profileId}/payout-account`, { bankCode: '058', accountNumber: '0000000001' }, 'advertiser')).status).toBe(404)
    await api('put', `/account/owner-profiles/${profileId}/payout-account`, { bankCode: '058', accountNumber: '0000000001' })

    ark('payouts:send')

    const failed = (await api('get', '/admin/payouts?status=failed', undefined, 'admin')).body.data.find((payout: { bookingId: string }) => payout.bookingId === bookingId)

    expect(failed).toMatchObject({ account: 'owner', amountMinor: 17_000_000, status: 'failed', failureReason: 'The bank turned the transfer down.' })
    expect((await api('post', `/admin/payouts/${failed.id}/retry`)).status).toBe(403)

    await api('put', `/account/owner-profiles/${profileId}/payout-account`, { bankCode: '044', accountNumber: '0123456789' })

    const retried = await api('post', `/admin/payouts/${failed.id}/retry`, undefined, 'admin')

    expect(retried.body.data).toMatchObject({ status: 'paid', bankName: 'Access Bank', accountNumber: '••••••6789' })
    expect((await api('post', `/admin/payouts/${failed.id}/retry`, undefined, 'admin')).status).toBe(422)

    expect((await api('get', '/account/payouts')).body.data).toMatchObject({ owedMinor: 0, paidMinor: 17_000_000 })
    expect((await api('get', '/account/payouts/history')).body.data[0]).toMatchObject({ bookingId, status: 'paid' })

    ark('payouts:send')
    expect((await api('get', '/account/payouts/history')).body.data.filter((payout: { bookingId: string }) => payout.bookingId === bookingId)).toHaveLength(1)
  }, 60_000)
})
