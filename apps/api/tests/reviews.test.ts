import { afterAll, beforeAll, describe, expect, it } from 'vitest'

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

describe('Reviews', { timeout: 60_000 }, () => {
  let boardId = ''
  let bookingId = ''

  beforeAll(async () => {
    for (const who of ['advertiser', 'owner', 'outsider', 'admin']) {
      const email = `reviews-${who}-${Date.now()}@greyboards.test`
      const register = await api('post', '/auth/register', { name: `Reviewing ${who}`, email, password: 'password123', roles: [who === 'owner' ? 'owner' : 'advertiser'] }, null)

      tokens[who] = register.body.data.token

      if (who === 'admin') ark('users:role', email, 'admin')
    }

    const board = { name: 'Board to review', kind: 'billboard', widthM: 12, heightM: 4, faces: 1, latitude: 8.6 + Math.random() / 100, longitude: 5.1, rateMinor: 30_000_000, as: 'owner' }

    boardId = (await api('post', '/account/boards', board, 'owner')).body.data.id
    await api('put', `/admin/boards/${boardId}`, { status: 'listed' }, 'admin')
    bookingId = (await api('post', `/boards/${boardId}/bookings`, { startsOn: fromToday(10), periods: 1 })).body.data.id
  }, 60_000)

  afterAll(async () => {
    await api('put', '/admin/settings/reviews', { min_to_show: null }, 'admin')
  })

  it('opens reviews once the ad is up, one for each side', async () => {
    expect((await api('post', `/bookings/${bookingId}/review`, { rating: 5 })).status).toBe(422)

    ark('db', `update bookings set status = 'live' where id = '${bookingId}'`)

    expect((await api('post', `/bookings/${bookingId}/review`, { rating: 6 })).status).toBe(422)
    expect((await api('post', `/bookings/${bookingId}/review`, { rating: 5 }, 'outsider')).status).toBe(404)

    const board = await api('post', `/bookings/${bookingId}/review`, { rating: 5, body: 'Seen by everyone on the bridge.' })

    expect(board.status).toBe(200)
    expect(board.body.data).toMatchObject({ subject: 'board', rating: 5 })
    expect((await api('post', `/bookings/${bookingId}/review`, { rating: 4, body: 'Artwork came early.' }, 'owner')).body.data).toMatchObject({ subject: 'advertiser', rating: 4 })

    const seen = (await api('get', `/bookings/${bookingId}`)).body.data.reviews

    expect(seen).toMatchObject({ subject: 'board', canWrite: true, mine: { rating: 5 }, advertiserRating: null })
    expect((await api('get', `/bookings/${bookingId}`, undefined, 'owner')).body.data.reviews).toMatchObject({ subject: 'advertiser', mine: { rating: 4 }, advertiserRating: { count: 1, average: null } })
  })

  it('shows averages once enough reviews are in, and keeps them right when a review changes', async () => {
    expect((await api('get', `/boards/${boardId}`)).body.data.rating).toEqual({ average: null, count: 1 })

    await api('put', '/admin/settings/reviews', { min_to_show: 1 }, 'admin')

    expect((await api('get', `/boards/${boardId}`)).body.data.rating).toEqual({ average: 5, count: 1 })

    await api('post', `/bookings/${bookingId}/review`, { rating: 3, body: 'Good, but hard to see at night.' })

    const reviews = await api('get', `/boards/${boardId}/reviews`, undefined, null)

    expect(reviews.body.summary).toEqual({ average: 3, count: 1 })
    expect(reviews.body.data).toEqual([expect.objectContaining({ rating: 3, body: 'Good, but hard to see at night.', author: 'Reviewing' })])
  })

  it('closes reviews a while after the booking ends', async () => {
    ark('db', `update bookings set status = 'completed', starts_on = '${fromToday(-90)}', ends_on = '${fromToday(-60)}' where id = '${bookingId}'`)

    expect((await api('post', `/bookings/${bookingId}/review`, { rating: 1 })).status).toBe(422)
    expect((await api('get', `/bookings/${bookingId}`)).body.data.reviews.canWrite).toBe(false)
  })
})
