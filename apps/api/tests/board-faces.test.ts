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


/** 'YYYY-MM-DD', `days` from today. */
const fromToday = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)

describe('Board faces and blocked dates', { timeout: 30_000 }, () => {
  let boardId = ''
  let faceA = ''
  let faceB = ''

  beforeAll(async () => {
    for (const who of ['advertiser', 'owner', 'admin']) {
      const email = `faces-${who}-${Date.now()}@greyboards.test`
      const register = await api('post', '/auth/register', { name: `Faces ${who}`, email, password: 'password123', roles: [who === 'owner' ? 'owner' : 'advertiser'] }, null)

      tokens[who] = register.body.data.token

      if (who === 'admin') ark('users:role', email, 'admin')
    }

    const board = { name: 'Two-sided board', kind: 'billboard', widthM: 12, heightM: 4, faces: 2, latitude: 6.45 + Math.random() / 100, longitude: 3.39, rateMinor: 50_000_000, as: 'owner' }

    boardId = (await api('post', '/account/boards', board, 'owner')).body.data.id
    await api('put', `/admin/boards/${boardId}`, { status: 'listed' }, 'admin')
  }, 60_000)

  it('gives each face its own rate card', async () => {
    const card = (await api('get', `/boards/${boardId}`)).body.data.rateCard

    expect(card.map((face: { label: string }) => face.label)).toEqual(['Face A', 'Face B'])
    expect(card[0]).toMatchObject({ rateMinor: 50_000_000, ownRateMinor: null, minPeriods: 1 })

    faceA = card[0].id
    faceB = card[1].id

    expect((await api('put', `/account/boards/${boardId}/faces/${faceB}`, { rateMinor: 30_000_000 }, 'advertiser')).status).toBe(404)

    const saved = await api('put', `/account/boards/${boardId}/faces/${faceB}`, { label: 'Facing the bridge', rateMinor: 30_000_000, minPeriods: 2 }, 'owner')

    expect(saved.body.data.rateCard[1]).toMatchObject({ label: 'Facing the bridge', rateMinor: 30_000_000, minPeriods: 2 })
  })

  it('books each face on its own, at its rate', async () => {
    const startsOn = fromToday(30)

    expect((await api('post', `/boards/${boardId}/bookings`, { startsOn, periods: 2 })).status).toBe(422)
    expect((await api('post', `/boards/${boardId}/bookings`, { startsOn, periods: 1, faceId: faceB })).status).toBe(422)

    const onB = await api('post', `/boards/${boardId}/bookings`, { startsOn, periods: 2, faceId: faceB })

    expect(onB.status).toBe(201)
    expect(onB.body.data).toMatchObject({ face: { id: faceB, label: 'Facing the bridge' }, rate: { amountMinor: 30_000_000 } })
    expect((await api('post', `/boards/${boardId}/bookings`, { startsOn, periods: 2, faceId: faceB })).status).toBe(409)
    expect((await api('post', `/boards/${boardId}/bookings`, { startsOn, periods: 1, faceId: faceA })).status).toBe(201)
    expect((await api('put', `/account/boards/${boardId}`, { faces: 1 }, 'owner')).status).toBe(422)
  })

  it('keeps blocked days off the market until the owner opens them again', async () => {
    const block = { startsOn: fromToday(200), endsOn: fromToday(210), note: 'Our own client' }

    expect((await api('post', `/account/boards/${boardId}/blocks`, { startsOn: fromToday(31), endsOn: fromToday(32), faceId: faceA }, 'owner')).status).toBe(409)
    expect((await api('post', `/account/boards/${boardId}/blocks`, { startsOn: fromToday(5), endsOn: fromToday(4) }, 'owner')).status).toBe(422)

    const blocked = await api('post', `/account/boards/${boardId}/blocks`, block, 'owner')

    expect(blocked.status).toBe(201)
    expect(blocked.body.data.blocks).toEqual([expect.objectContaining({ faceId: null, startsOn: block.startsOn, endsOn: block.endsOn, note: 'Our own client' })])

    const availability = (await api('get', `/boards/${boardId}/availability?faceId=${faceA}`)).body.data

    expect(availability).toContainEqual({ startsOn: block.startsOn, endsOn: block.endsOn, blocked: true })
    expect((await api('post', `/boards/${boardId}/bookings`, { startsOn: fromToday(195), periods: 1, faceId: faceA })).status).toBe(409)

    await api('delete', `/account/boards/${boardId}/blocks/${blocked.body.data.blocks[0].id}`, undefined, 'owner')

    expect((await api('post', `/boards/${boardId}/bookings`, { startsOn: fromToday(195), periods: 1, faceId: faceA })).status).toBe(201)
  })
})
