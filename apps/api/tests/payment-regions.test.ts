import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'
import { ark } from './support/ark'

const tokens: Record<string, string> = {}

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: Record<string, unknown>, as: string | null = 'advertiser', country?: string) => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)
  if (country) call.set('X-Country', country)

  return body ? call.send(body) : call
}

/** 'YYYY-MM-DD', `days` from today. */
const fromToday = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)

describe('Currency and payment regions', { timeout: 30_000 }, () => {
  // A user-assigned code, so runs never clash with each other or a real region.
  const letters = 'ABCDEFGHIJLMNOPQRSTUVW'
  const country = `X${letters[Math.floor(Math.random() * letters.length)]}`
  let regionId = ''

  beforeAll(async () => {
    ark('db', `delete from payment_regions where countries::jsonb @> '["${country}"]'::jsonb`)

    for (const who of ['advertiser', 'owner', 'admin']) {
      const email = `region-${who}-${Date.now()}@greyboards.test`
      const register = await api('post', '/auth/register', { name: `Region ${who}`, email, password: 'password123', roles: [who === 'owner' ? 'owner' : 'advertiser'] }, null)

      tokens[who] = register.body.data.token

      if (who === 'admin') ark('users:role', email, 'admin')
    }
  }, 60_000)

  afterAll(() => {
    if (regionId) ark('db', `delete from payment_regions where id = '${regionId}'`)
  })

  it('lets admins group countries under a currency and provider, once each', async () => {
    expect((await api('post', '/admin/payment-regions', { name: 'Test region', countries: [country], currency: 'GHS' })).status).toBe(403)
    expect((await api('post', '/admin/payment-regions', { name: 'Test region', countries: [country], currency: 'GHS', provider: 'nobody' }, 'admin')).status).toBe(422)

    const created = await api('post', '/admin/payment-regions', { name: 'Test region', countries: [country.toLowerCase()], currency: 'ghs', provider: 'flutterwave', exchangeRate: 0.01 }, 'admin')

    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({ countries: [country], currency: 'GHS', provider: 'flutterwave', exchangeRate: 0.01, active: true })

    regionId = created.body.data.id

    const clash = await api('post', '/admin/payment-regions', { name: 'Clash', countries: [country], currency: 'USD' }, 'admin')

    expect(clash.status).toBe(422)
    expect(clash.body.errors.countries[0]).toContain('Test region')

    const list = await api('get', '/admin/payment-regions', undefined, 'admin')

    expect(list.body.providers).toEqual([{ value: 'flutterwave', label: 'Flutterwave' }])
    expect(list.body.data.some((region: { id: string }) => region.id === regionId)).toBe(true)
  })

  it('tells apps the currency for a country', async () => {
    expect((await api('get', `/currency?country=${country}`, undefined, null)).body.data).toMatchObject({ country, currency: 'GHS', default: 'NGN' })
    expect((await api('get', '/currency', undefined, null, 'NG')).body.data).toMatchObject({ country: 'NG', currency: 'NGN', default: 'NGN' })
    expect((await api('get', '/currency', undefined, null)).body.data.regions[country]).toBe('GHS')
  })

  it('prices a board in its country’s currency', async () => {
    const board = await api('post', '/account/boards', { name: 'Region board', kind: 'billboard', widthM: 10, heightM: 5, latitude: 9.1, longitude: 7.4, country, rateMinor: 10_000_000, as: 'owner' }, 'owner')

    expect(board.body.data.rate).toMatchObject({ currency: 'GHS' })
  })

  it('charges a payer in their region and keeps the booking in the board’s currency', async () => {
    const latitude = 9.2 + Math.random() / 100
    const boardId = (await api('post', '/account/boards', { name: 'Naira board', kind: 'billboard', widthM: 10, heightM: 5, latitude, longitude: 7.49, rateMinor: 50_000_000, as: 'owner' }, 'owner')).body.data.id

    await api('put', `/admin/boards/${boardId}`, { status: 'listed' }, 'admin')

    const held = (await api('post', `/boards/${boardId}/bookings`, { startsOn: fromToday(40), periods: 1 })).body.data

    expect(held.currency).toBe('NGN')

    const payment = (await api('post', `/bookings/${held.id}/checkout`, undefined, 'advertiser', country)).body.data

    expect(payment).toMatchObject({ amountMinor: held.amountMinor, currency: 'NGN', chargeAmountMinor: Math.ceil(held.amountMinor * 0.01), chargeCurrency: 'GHS' })

    const verified = await api('post', `/payments/${payment.reference}/verify`)

    expect(verified.body.data.status).toBe('complete')
    expect((await api('get', `/bookings/${held.id}`)).body.data).toMatchObject({ status: 'paid', currency: 'NGN' })

    const cancelled = await api('post', `/bookings/${held.id}/cancel`)

    expect(cancelled.body.data.refunds[0]).toMatchObject({ amountMinor: held.amountMinor, currency: 'NGN', status: 'refunded' })
  })
})
