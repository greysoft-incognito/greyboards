import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'
import { ark } from './support/ark'

const tokens: Record<string, string> = {}

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: Record<string, unknown>, as: string | null = 'first') => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

/** 'YYYY-MM-DD', `days` from today. */
const fromToday = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)

const inHours = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString()

describe('Bids and offers', { timeout: 60_000 }, () => {
  let boardId = ''
  let auctionId = ''

  beforeAll(async () => {
    for (const who of ['first', 'second', 'owner', 'admin']) {
      const email = `bids-${who}-${Date.now()}@greyboards.test`
      const register = await api('post', '/auth/register', { name: `Bids ${who}`, email, password: 'password123', roles: [who === 'owner' ? 'owner' : 'advertiser'] }, null)

      tokens[who] = register.body.data.token

      if (who === 'admin') ark('users:role', email, 'admin')
    }

    const board = { name: 'Board up for bids', kind: 'billboard', widthM: 12, heightM: 4, faces: 1, latitude: 7.2 + Math.random() / 100, longitude: 3.95, rateMinor: 50_000_000, as: 'owner' }

    boardId = (await api('post', '/account/boards', board, 'owner')).body.data.id
    await api('put', `/admin/boards/${boardId}`, { status: 'listed' }, 'admin')
  }, 60_000)

  it('lets whoever looks after the board open dates to bids, above the lowest reserve', async () => {
    const auction = { startsOn: fromToday(40), periods: 1, reserveMinor: 50_000_000, closesAt: inHours(2) }

    expect((await api('post', `/account/boards/${boardId}/auctions`, auction, 'first')).status).toBe(404)
    expect((await api('post', `/account/boards/${boardId}/auctions`, { ...auction, reserveMinor: 40_000_000 }, 'owner')).status).toBe(422)
    expect((await api('post', `/account/boards/${boardId}/auctions`, { ...auction, closesAt: inHours(24 * 39) }, 'owner')).status).toBe(422)

    const opened = await api('post', `/account/boards/${boardId}/auctions`, auction, 'owner')

    expect(opened.status).toBe(201)
    expect(opened.body.data).toMatchObject({ status: 'open', open: true, format: 'open', reserveMinor: 50_000_000, bidCount: 0, highestMinor: null, nextMinimumMinor: 50_000_000 })

    auctionId = opened.body.data.id

    const availability = (await api('get', `/boards/${boardId}/availability`)).body.data

    expect(availability).toContainEqual(expect.objectContaining({ startsOn: auction.startsOn, auction: true }))
    expect((await api('post', `/boards/${boardId}/bookings`, { startsOn: fromToday(45), periods: 1 })).status).toBe(409)
    expect((await api('post', `/account/boards/${boardId}/auctions`, auction, 'owner')).status).toBe(409)
  })

  it('takes rising bids, shows the highest, and pushes the close back for late bids', async () => {
    expect((await api('post', `/auctions/${auctionId}/bids`, { amountMinor: 49_000_000 })).status).toBe(422)
    expect((await api('post', `/auctions/${auctionId}/bids`, { amountMinor: 50_000_000 })).status).toBe(200)
    expect((await api('post', `/auctions/${auctionId}/bids`, { amountMinor: 51_000_000 }, 'second')).status).toBe(422)
    expect((await api('post', `/auctions/${auctionId}/bids`, { amountMinor: 52_500_000 }, 'second')).status).toBe(200)
    expect((await api('post', `/auctions/${auctionId}/bids`, { amountMinor: 60_000_000 }, 'owner')).status).toBe(403)
    expect((await api('post', `/auctions/${auctionId}/cancel`, undefined, 'owner')).status).toBe(422)

    const seen = (await api('get', `/auctions/${auctionId}`)).body.data

    expect(seen).toMatchObject({ bidCount: 2, highestMinor: 52_500_000, nextMinimumMinor: 55_125_000, myBid: { amountMinor: 50_000_000, leading: false } })

    ark('db', `update auctions set closes_at = now() + interval '2 minutes' where id = '${auctionId}'`)

    const late = (await api('post', `/auctions/${auctionId}/bids`, { amountMinor: 60_000_000 })).body.data

    expect(new Date(late.closesAt).getTime()).toBeGreaterThan(Date.now() + 4 * 60_000)
    expect(late.myBid).toMatchObject({ amountMinor: 60_000_000, leading: true })
  })

  it('gives the dates to the highest bid, and to the next one if the winner does not pay', async () => {
    ark('db', `update auctions set closes_at = now() - interval '1 minute' where id = '${auctionId}'`)
    ark('bids:settle')

    const won = (await api('get', `/auctions/${auctionId}`)).body.data

    expect(won).toMatchObject({ status: 'awarded', open: false, highestMinor: 60_000_000, myBid: { status: 'won' } })

    const booking = (await api('get', `/bookings/${won.myBid.bookingId}`)).body.data

    expect(booking).toMatchObject({ status: 'held', source: 'bid', amountMinor: 60_000_000 + booking.printFeeMinor })
    expect(booking.holdSecondsLeft).toBeGreaterThan(23 * 3600)

    ark('db', `update bookings set hold_expires_at = now() - interval '1 minute' where id = '${booking.id}'`)
    ark('bids:settle')

    const passed = (await api('get', `/auctions/${auctionId}`, undefined, 'second')).body.data

    expect(passed).toMatchObject({ status: 'awarded', myBid: { status: 'won', amountMinor: 52_500_000 } })
    expect((await api('get', `/auctions/${auctionId}`)).body.data.myBid.status).toBe('lapsed')

    const started = await api('post', `/bookings/${passed.myBid.bookingId}/checkout`, undefined, 'second')

    await api('post', `/payments/${started.body.data.reference}/verify`, undefined, 'second')
    ark('bids:settle')

    expect((await api('get', `/auctions/${auctionId}`)).body.data.status).toBe('sold')
    expect((await api('get', '/account/bids', undefined, 'second')).body.data[0]).toMatchObject({ id: auctionId, board: { id: boardId } })
  })

  it('lets advertisers offer below the price, and the board’s side accept, decline or counter', async () => {
    const offer = { startsOn: fromToday(80), periods: 1, amountMinor: 40_000_000, note: 'Our launch month' }

    expect((await api('post', `/boards/${boardId}/offers`, { ...offer, amountMinor: 50_000_000 })).status).toBe(422)
    expect((await api('post', `/boards/${boardId}/offers`, { ...offer, amountMinor: 20_000_000 })).status).toBe(422)

    const made = await api('post', `/boards/${boardId}/offers`, offer)

    expect(made.status).toBe(201)
    expect(made.body.data).toMatchObject({ status: 'pending', listMinor: 50_000_000, amountMinor: 40_000_000, can: { accept: false, withdraw: true } })

    const id = made.body.data.id
    const waiting = (await api('get', '/account/board-offers', undefined, 'owner')).body.data.find((entry: { id: string }) => entry.id === id)

    expect(waiting).toMatchObject({ can: { accept: true, counter: true }, advertiser: { name: 'Bids first' } })
    expect((await api('post', `/offers/${id}/accept`)).status).toBe(422)
    expect((await api('post', `/offers/${id}/counter`, { amountMinor: 55_000_000 }, 'owner')).status).toBe(422)
    expect((await api('post', `/offers/${id}/counter`, { amountMinor: 45_000_000 }, 'owner')).body.data).toMatchObject({ status: 'countered', counterMinor: 45_000_000 })
    expect((await api('post', `/offers/${id}/accept`, undefined, 'owner')).status).toBe(422)
    expect((await api('post', `/offers/${id}/accept`, undefined, 'second')).status).toBe(404)

    const accepted = await api('post', `/offers/${id}/accept`)

    expect(accepted.status).toBe(200)
    expect(accepted.body.data).toMatchObject({ status: 'held', source: 'offer', amountMinor: 45_000_000 + accepted.body.data.printFeeMinor })
    expect((await api('get', '/account/offers')).body.data[0]).toMatchObject({ id, status: 'accepted', bookingId: accepted.body.data.id })

    const other = (await api('post', `/boards/${boardId}/offers`, { ...offer, startsOn: fromToday(120) }, 'second')).body.data

    expect((await api('post', `/offers/${other.id}/withdraw`, undefined, 'second')).body.data.status).toBe('withdrawn')
    expect((await api('post', `/offers/${other.id}/decline`, undefined, 'owner')).status).toBe(422)
  })
})
