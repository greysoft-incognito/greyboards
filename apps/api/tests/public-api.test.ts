import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'
import { ark } from './support/ark'

const tokens: Record<string, string> = {}

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: Record<string, unknown>, as: string | null = 'agency') => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

/** A call to the public API with an API key instead of a sign-in. */
const v1 = (method: 'get' | 'post', path: string, key: string, body?: Record<string, unknown>) => {
  const call = request(app)[method](`/api/v1${path}`).set({ Accept: 'application/json', Authorization: `Bearer ${key}` })

  return body ? call.send(body) : call
}

/** A day `days` from today, as 'YYYY-MM-DD'. */
const day = (days: number) => {
  const date = new Date()

  date.setUTCDate(date.getUTCDate() + days)

  return date.toISOString().slice(0, 10)
}

describe('Public API', () => {
  let readKey = ''
  let bookKey = ''
  let boardId = ''

  beforeAll(async () => {
    for (const who of ['agency', 'owner', 'admin']) {
      const email = `public-${who}-${Date.now()}@greyboards.test`
      const register = await api('post', '/auth/register', { name: `Public ${who}`, email, password: 'password123', roles: [who === 'owner' ? 'owner' : 'advertiser'] }, null)

      tokens[who] = register.body.data.token

      if (who === 'admin') ark('users:role', email, 'admin')
    }

    const board = { name: 'API board', kind: 'billboard', widthM: 12, heightM: 4, latitude: 9 + Math.random(), longitude: 6 + Math.random(), rateMinor: 50_000_000, ratePeriod: 'month', as: 'owner' }

    boardId = (await api('post', '/account/boards', board, 'owner')).body.data.id
    await api('put', `/admin/boards/${boardId}`, { status: 'listed' }, 'admin')
  }, 60_000)

  afterAll(async () => {
    await api('put', '/admin/settings/public_api', { requests_per_minute: null, max_keys: null }, 'admin')
  })

  it('makes keys that show once and can read, or read and book', async () => {
    const read = await api('post', '/account/api-keys', { name: 'Reporting', abilities: ['read'] })

    expect(read.status).toBe(201)
    expect(read.body.data.token).toMatch(/^gbk_/)
    readKey = read.body.data.token

    bookKey = (await api('post', '/account/api-keys', { name: 'Media buying', abilities: ['read', 'book'] })).body.data.token

    const listed = (await api('get', '/account/api-keys')).body.data

    expect(listed).toHaveLength(2)
    expect(listed[0]).toMatchObject({ name: 'Media buying', abilities: ['read', 'book'], prefix: bookKey.slice(0, 10) })
    expect(JSON.stringify(listed)).not.toContain(bookKey)
    expect((await api('post', '/account/api-keys', { name: 'Bad', abilities: ['admin'] })).status).toBe(422)
  })

  it('searches boards and reads the account with a read key', async () => {
    expect((await v1('get', '/me', readKey)).body.data).toMatchObject({ name: 'Public agency' })
    expect((await v1('get', `/boards/${boardId}`, readKey)).body.data).toMatchObject({ id: boardId, name: 'API board' })
    expect((await v1('get', `/boards/${boardId}/availability`, readKey)).status).toBe(200)
    expect((await v1('get', '/boards?kind=billboard', readKey)).status).toBe(200)
    expect((await v1('get', `/boards/${boardId}/slots`, readKey)).status).toBe(422)
    expect((await v1('get', '/me', 'gbk_nope')).status).toBe(401)
    expect((await request(app).get('/api/v1/me').set({ Accept: 'application/json', Authorization: `Bearer ${tokens.agency}` })).status).toBe(401)
  })

  it('books and starts payment only with a key that can book', async () => {
    expect((await v1('post', `/boards/${boardId}/bookings`, readKey, { startsOn: day(20), periods: 1 })).status).toBe(403)

    const held = await v1('post', `/boards/${boardId}/bookings`, bookKey, { startsOn: day(20), periods: 1 })

    expect(held.status).toBe(201)
    expect(held.body.data).toMatchObject({ status: 'held', amountMinor: 50_000_000 })
    expect((await v1('get', '/bookings', readKey)).body.data.map((booking: { id: string }) => booking.id)).toContain(held.body.data.id)

    const checkout = await v1('post', `/bookings/${held.body.data.id}/checkout`, bookKey)

    expect(checkout.status).toBe(201)
    expect(checkout.body.data.checkoutUrl).toBeTruthy()
  })

  it('limits requests per key each minute, and stops removed keys', async () => {
    await api('put', '/admin/settings/public_api', { requests_per_minute: 10, max_keys: 2 }, 'admin')

    const limited = (await api('post', '/account/api-keys', { name: 'Third' })).status

    expect(limited).toBe(422)

    const statuses: number[] = []

    for (let call = 0; call < 12; call++) statuses.push((await v1('get', '/me', readKey)).status)

    expect(statuses).toContain(429)

    const keys = (await api('get', '/account/api-keys')).body.data

    await api('delete', `/account/api-keys/${keys.find((key: { name: string }) => key.name === 'Media buying').id}`)

    expect((await v1('get', '/me', bookKey)).status).toBe(401)
  })
})
