import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import { execFileSync } from 'node:child_process'
import request from 'parasito'

const tokens: Record<string, string> = {}

const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: Record<string, unknown>, as: string | null = 'owner') => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

/** A board on Admiralty Way, Lekki, a little apart from the others each test run tags. */
const lekki = (offset = 0) => ({
  name: 'Admiralty Way, by the roundabout',
  kind: 'billboard',
  widthM: 12,
  heightM: 4,
  latitude: 6.4474 + offset,
  longitude: 3.4724 + offset,
  accuracyM: 6,
  rateMinor: 85_000_000,
  ratePeriod: 'month',
  city: 'Lagos',
  country: 'ng',
})

describe('Boards', () => {
  const run = Math.random() / 1000

  beforeAll(async () => {
    for (const who of ['owner', 'scout', 'reviewer', 'visitor']) {
      const email = `boards-${who}-${Date.now()}@greyboards.test`
      const roles = who === 'owner' ? ['owner'] : who === 'scout' ? ['scout'] : ['advertiser']
      const register = await api('post', '/auth/register', { name: `Boards ${who}`, email, password: 'password123', roles }, null)

      tokens[who] = register.body.data.token

      if (who === 'reviewer') execFileSync('npx', ['ark', 'users:role', email, 'reviewer'], { cwd: process.cwd(), encoding: 'utf8' })
    }

    const scoutRole = (await api('get', '/account/roles', undefined, 'scout')).body.data[0]

    await api('put', `/admin/account-roles/${scoutRole.id}`, { status: 'active' }, 'reviewer')
  }, 60_000)

  it('lets owners tag their own boards, which wait for review', async () => {
    const res = await api('post', '/account/boards', { ...lekki(run), as: 'owner' })

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ status: 'pending', kind: 'billboard', country: 'NG', rate: { amountMinor: 85_000_000, currency: 'NGN', period: 'month' } })
    expect(res.body.data.ownerName).toBe('Boards owner')
    expect((await api('get', `/boards/${res.body.data.id}`, undefined, null)).status).toBe(404)
  })

  it('needs a role that can tag, and the owner’s phone from scouts', async () => {
    expect((await api('post', '/account/boards', { ...lekki(run), as: 'owner' }, 'visitor')).status).toBe(403)
    expect((await api('post', '/account/boards', { ...lekki(run), as: 'owner' }, 'scout')).status).toBe(403)
    expect((await api('post', '/account/boards', { ...lekki(run), as: 'scout' }, 'scout')).status).toBe(422)
    expect((await api('post', '/account/boards', { ...lekki(run), latitude: 120, as: 'owner' })).status).toBe(422)
  })

  it('lists a board once a reviewer checks it, and finds it on the map and nearby', async () => {
    const tagged = await api('post', '/account/boards', { ...lekki(run + 0.01), ownerName: 'Mr Adeyemi', ownerPhone: '+234 803 000 0000', as: 'scout' }, 'scout')
    const id = tagged.body.data.id

    expect((await api('get', '/admin/boards', undefined, 'reviewer')).body.data.map((board: { id: string }) => board.id)).toContain(id)
    expect((await api('get', '/admin/boards', undefined, 'scout')).status).toBe(403)

    const listed = await api('put', `/admin/boards/${id}`, { status: 'listed' }, 'reviewer')

    expect(listed.body.data.status).toBe('listed')

    const lat = 6.4474 + run + 0.01
    const lng = 3.4724 + run + 0.01
    const inBox = await api('get', `/boards?west=${lng - 0.001}&south=${lat - 0.001}&east=${lng + 0.001}&north=${lat + 0.001}`, undefined, null)
    const nearby = await api('get', `/boards?lat=${lat + 0.009}&lng=${lng}&radiusKm=2`, undefined, null)
    const far = await api('get', `/boards?lat=${lat + 0.5}&lng=${lng}&radiusKm=2`, undefined, null)
    const found = nearby.body.data.find((board: { id: string }) => board.id === id)

    expect(inBox.body.data.map((board: { id: string }) => board.id)).toContain(id)
    expect(inBox.body.data.every((board: { latitude: number }) => Math.abs(board.latitude - lat) <= 0.001)).toBe(true)
    expect(found.distanceM).toBeGreaterThan(900)
    expect(found.distanceM).toBeLessThan(1100)
    expect(far.body.data.map((board: { id: string }) => board.id)).not.toContain(id)

    const shown = await api('get', `/boards/${id}`, undefined, null)

    expect(shown.body.data).toMatchObject({ id, status: 'listed' })
    expect(shown.body.data.ownerPhone).toBeUndefined()
    expect((await api('get', `/boards/${id}`, undefined, 'scout')).body.data.ownerPhone).toBe('+234 803 000 0000')
  })

  it('sends a listed board back for review when it moves', async () => {
    const tagged = await api('post', '/account/boards', { ...lekki(run + 0.02), as: 'owner' })
    const id = tagged.body.data.id

    await api('put', `/admin/boards/${id}`, { status: 'listed' }, 'reviewer')

    expect((await api('put', `/account/boards/${id}`, { name: 'Admiralty Way, facing traffic' })).body.data.status).toBe('listed')
    expect((await api('put', `/account/boards/${id}`, { latitude: 6.45 + run })).body.data.status).toBe('pending')
    expect((await api('put', `/account/boards/${id}`, { name: 'Taken' }, 'scout')).status).toBe(404)
  })

  it('keeps photos with where they were taken', async () => {
    const id = (await api('post', '/account/boards', { ...lekki(run + 0.03), as: 'owner' })).body.data.id
    const form = new FormData()

    form.append('photo', new Blob([pixel], { type: 'image/png' }), 'board.png')
    form.append('latitude', String(6.4474 + run + 0.03))
    form.append('longitude', String(3.4724 + run + 0.0301))
    form.append('accuracyM', '5')

    const res = await request(app)
      .post(`/api/account/boards/${id}/photos`)
      .set({ Accept: 'application/json', Authorization: `Bearer ${tokens.owner}` })
      .send(form)

    expect(res.status).toBe(201)
    expect(res.body.data.distanceM).toBeGreaterThan(5)
    expect(res.body.data.distanceM).toBeLessThan(20)
    expect(new URL(res.body.data.url, 'http://localhost').pathname).toMatch(new RegExp(`^/boards/${id}/.+\\.png$`))

    const mine = await api('get', '/account/boards')

    expect(mine.body.data.find((board: { id: string }) => board.id === id).coverUrl).toBe(res.body.data.url)
    expect((await api('delete', `/account/boards/${id}/photos/${res.body.data.id}`)).status).toBe(200)
    expect((await api('delete', `/account/boards/${id}`)).status).toBe(200)
  })

  it("doesn't take pending as a review decision", async () => {
    const scout = (await api('get', '/account/boards', undefined, 'scout')).body.data[0]

    expect((await api('put', `/admin/boards/${scout.id}`, { status: 'pending' }, 'reviewer')).status).toBe(422)
  })
})
