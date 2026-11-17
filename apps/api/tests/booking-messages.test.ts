import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'
import { ark } from './support/ark'
import { lastText } from './support/sms'

const tokens: Record<string, string> = {}

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: Record<string, unknown>, as: string | null = 'advertiser') => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

/** 'YYYY-MM-DD', `days` from today. */
const fromToday = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)

/** A tiny PNG, as a proof or evidence photo. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

describe('Messages about a booking', { timeout: 60_000 }, () => {
  let bookingId = ''
  const phone = `+234803${String(Date.now()).slice(-7)}`

  beforeAll(async () => {
    for (const who of ['advertiser', 'owner', 'outsider', 'admin']) {
      const email = `messages-${who}-${Date.now()}@greyboards.test`
      const register = await api('post', '/auth/register', { name: `Messages ${who}`, email, password: 'password123', roles: [who === 'owner' ? 'owner' : 'advertiser'] }, null)

      tokens[who] = register.body.data.token

      if (who === 'admin') ark('users:role', email, 'admin')
    }

    const board = { name: 'Board to talk about', kind: 'billboard', widthM: 12, heightM: 4, faces: 1, latitude: 8.1 + Math.random() / 100, longitude: 4.6, rateMinor: 40_000_000, as: 'owner' }
    const boardId = (await api('post', '/account/boards', board, 'owner')).body.data.id

    await api('put', `/admin/boards/${boardId}`, { status: 'listed' }, 'admin')

    bookingId = (await api('post', `/boards/${boardId}/bookings`, { startsOn: fromToday(20), periods: 1 })).body.data.id
  }, 60_000)

  it('keeps messages and photos with the booking, for the people on it only', async () => {
    expect((await api('post', `/bookings/${bookingId}/messages`, { body: '  ' })).status).toBe(422)
    expect((await api('post', `/bookings/${bookingId}/messages`, { body: 'Hello' }, 'outsider')).status).toBe(404)

    const sent = await api('post', `/bookings/${bookingId}/messages`, { body: 'Can the ad face the bridge side?' })

    expect(sent.status).toBe(201)
    expect(sent.body.data).toMatchObject({ body: 'Can the ad face the bridge side?', mine: true, author: { name: 'Messages advertiser', side: 'advertiser' } })

    const form = new FormData()

    form.append('body', 'This is the side it faces.')
    form.append('photo', new Blob([PNG], { type: 'image/png' }), 'side.png')

    const photo = await request(app).post(`/api/bookings/${bookingId}/messages`).set({ Accept: 'application/json', Authorization: `Bearer ${tokens.owner}` }).send(form)

    expect(photo.status).toBe(201)
    expect(photo.body.data).toMatchObject({ author: { side: 'board' }, photo: { width: 1, height: 1 } })
    expect((await api('get', `/bookings/${bookingId}`)).body.data.messages).toEqual({ total: 2, unread: 1 })

    const page = (await api('get', `/bookings/${bookingId}/messages`)).body.data

    expect(page.map((message: { body: string }) => message.body)).toEqual(['This is the side it faces.', 'Can the ad face the bridge side?'])
    expect(page[0].photo.url).toBeTruthy()
    expect((await api('get', `/bookings/${bookingId}`)).body.data.messages).toEqual({ total: 2, unread: 0 })
    expect((await api('get', `/bookings/${bookingId}/messages`, undefined, 'outsider')).status).toBe(404)
  })

  it('texts owners who have no account, so they can follow along', async () => {
    ark('db', `update owner_profiles set user_id = null, phone = '${phone}' where id = (select owner_profile_id from bookings where id = '${bookingId}')`)

    await api('post', `/bookings/${bookingId}/messages`, { body: 'Artwork is on its way tomorrow.' })

    expect(lastText(phone)).toBe('Messages advertiser about the ad on "Board to talk about": Artwork is on its way tomorrow. - Greyboards')
  })
})
