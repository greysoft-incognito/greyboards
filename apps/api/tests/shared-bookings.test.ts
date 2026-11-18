import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'
import sharp from 'sharp'
import { ark } from './support/ark'

const tokens: Record<string, string> = {}

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: Record<string, unknown>, as: string | null = 'organiser') => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

/** 'YYYY-MM-DD', `days` from today. */
const fromToday = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)

/** Pay what `who` owes on a booking, through the test gateway. */
const pay = async (bookingId: string, who: string) => {
  const started = await api('post', `/bookings/${bookingId}/checkout`, undefined, who)

  expect(started.status).toBe(201)
  await api('post', `/payments/${started.body.data.reference}/verify`, undefined, who)

  return started.body.data
}

const tokenOf = (url: string) => url.split('/shares/')[1]

/** Send `who`'s design for a share, as a plain image of one colour. */
const sendDesign = async (bookingId: string, shareId: string, who: string, field: 'design' | 'artwork' = 'design') => {
  const png = await sharp({ create: { width: 600, height: 400, channels: 3, background: who === 'organiser' ? '#833b4b' : '#2255aa' } }).png().toBuffer()
  const form = new FormData()

  form.append(field, new Blob([new Uint8Array(png)], { type: 'image/png' }), 'design.png')

  return request(app)
    .post(`/api/bookings/${bookingId}/${field === 'design' ? `shares/${shareId}/design` : 'artwork'}`)
    .set({ Accept: 'application/json', Authorization: `Bearer ${tokens[who]}` })
    .send(form)
}

describe('Shared bookings', { timeout: 60_000 }, () => {
  let boardId = ''

  beforeAll(async () => {
    for (const who of ['organiser', 'second', 'third', 'buyer', 'owner', 'admin']) {
      const email = `shares-${who}-${Date.now()}@greyboards.test`
      const register = await api('post', '/auth/register', { name: `Shares ${who}`, email, password: 'password123', roles: [who === 'owner' ? 'owner' : 'advertiser'] }, null)

      tokens[who] = register.body.data.token

      if (who === 'admin') ark('users:role', email, 'admin')
    }

    const board = { name: 'Board to share', kind: 'billboard', widthM: 12, heightM: 4, faces: 1, latitude: 7.6 + Math.random() / 100, longitude: 4.3, rateMinor: 60_000_000, as: 'owner' }

    boardId = (await api('post', '/account/boards', board, 'owner')).body.data.id
    await api('put', `/admin/boards/${boardId}`, { status: 'listed' }, 'admin')
  }, 60_000)

  it('splits a booking into shares the others join by link, and books it once every share is paid', async () => {
    expect((await api('post', `/boards/${boardId}/bookings`, { startsOn: fromToday(4), periods: 1, shares: 3 })).status).toBe(422)
    expect((await api('post', `/boards/${boardId}/bookings`, { startsOn: fromToday(30), periods: 1, shares: 7 })).status).toBe(422)

    const held = await api('post', `/boards/${boardId}/bookings`, { startsOn: fromToday(30), periods: 1, shares: 3 })
    const booking = held.body.data

    expect(held.status).toBe(201)
    expect(booking).toMatchObject({ status: 'held', shared: true })
    expect(booking.holdSecondsLeft).toBeGreaterThan(47 * 3600)
    expect(booking.shares).toHaveLength(3)
    expect(booking.shares.reduce((sum: number, share: { amountMinor: number }) => sum + share.amountMinor, 0)).toBe(booking.amountMinor)
    expect(booking.shares[0]).toMatchObject({ position: 1, status: 'claimed', mine: true, inviteUrl: null })
    expect(booking.shares[1].inviteUrl).toContain('/shares/')

    const invite = tokenOf(booking.shares[1].inviteUrl)

    expect((await api('get', `/shares/${invite}`, undefined, 'second')).body.data).toMatchObject({ position: 2, count: 3, open: true, organiser: 'Shares organiser' })
    expect((await api('get', `/bookings/${booking.id}`, undefined, 'second')).status).toBe(404)
    expect((await api('post', `/shares/${invite}/claim`, undefined, 'organiser')).status).toBe(422)
    expect((await api('post', `/shares/${invite}/claim`, undefined, 'second')).status).toBe(200)
    expect((await api('post', `/shares/${invite}/claim`, undefined, 'third')).status).toBe(409)

    const paid = await pay(booking.id, 'second')

    expect(paid.amountMinor).toBe(booking.shares[1].amountMinor)
    expect((await api('get', `/bookings/${booking.id}`, undefined, 'second')).body.data).toMatchObject({ status: 'held', shares: [{ holder: 'Shares organiser' }, { status: 'paid', mine: true, inviteUrl: null }, { status: 'open' }] })

    await pay(booking.id, 'organiser')

    expect((await api('post', `/bookings/${booking.id}/shares/cover`, undefined, 'second')).status).toBe(403)
    expect((await api('post', `/bookings/${booking.id}/shares/cover`)).body.data.shares[2]).toMatchObject({ status: 'claimed', mine: true })

    await pay(booking.id, 'organiser')

    const done = (await api('get', `/bookings/${booking.id}`)).body.data

    expect(done.status).toBe('paid')
    expect(done.shares.every((share: { status: string }) => share.status === 'paid')).toBe(true)
    expect(ark('db', `select sum(amount_minor) from ledger_entries where booking_id = '${booking.id}' and account = 'escrow'`)).toContain(String(booking.amountMinor))
    expect((await api('get', '/account/bookings', undefined, 'second')).body.data.map((entry: { id: string }) => entry.id)).toContain(booking.id)

    const cancelled = await api('post', `/bookings/${booking.id}/cancel`)

    expect(cancelled.status).toBe(200)
    expect(cancelled.body.data.refunds.reduce((sum: number, refund: { amountMinor: number }) => sum + refund.amountMinor, 0)).toBe(booking.amountMinor)
    expect(cancelled.body.data.refunds).toHaveLength(3)
  })

  it('merges every advertiser’s design into one print', async () => {
    const booking = (await api('post', `/boards/${boardId}/bookings`, { startsOn: fromToday(100), periods: 1, shares: 2 })).body.data

    await api('post', `/shares/${tokenOf(booking.shares[1].inviteUrl)}/claim`, undefined, 'second')
    await pay(booking.id, 'second')
    await pay(booking.id, 'organiser')

    const [mine, theirs] = (await api('get', `/bookings/${booking.id}`)).body.data.shares

    expect((await sendDesign(booking.id, mine.id, 'organiser', 'artwork')).status).toBe(422)
    expect((await sendDesign(booking.id, mine.id, 'second')).status).toBe(403)

    const first = await sendDesign(booking.id, theirs.id, 'second')

    expect(first.status).toBe(200)
    expect(first.body.message).toMatch(/once everyone has sent theirs/)
    expect(first.body.data.artwork.status).toBe('none')

    const merged = (await sendDesign(booking.id, mine.id, 'organiser')).body.data

    // The board is 12 m by 4 m, so the print is three times as wide as it is tall.
    expect(merged.artwork).toMatchObject({ status: 'submitted', width: 3000, height: 1000 })
    expect(merged.shares.every((share: { designUrl: string | null }) => !!share.designUrl)).toBe(true)
    expect((await api('post', `/bookings/${booking.id}/artwork/review`, { decision: 'approve' }, 'owner')).body.data.artwork.status).toBe('approved')
    expect((await sendDesign(booking.id, mine.id, 'organiser')).status).toBe(422)
  })

  it('gives everyone their money back when the shares aren’t all paid in time', async () => {
    const booking = (await api('post', `/boards/${boardId}/bookings`, { startsOn: fromToday(60), periods: 1, shares: 2 })).body.data
    const invite = tokenOf(booking.shares[1].inviteUrl)

    await api('post', `/shares/${invite}/claim`, undefined, 'third')
    await pay(booking.id, 'third')

    ark('db', `update bookings set hold_expires_at = now() - interval '1 minute' where id = '${booking.id}'`)
    ark('bookings:settle')

    const lapsed = (await api('get', `/bookings/${booking.id}`, undefined, 'third')).body.data

    expect(lapsed.status).toBe('expired')
    expect(lapsed.shares[1].status).toBe('refunded')
    expect(lapsed.refunds).toEqual([expect.objectContaining({ amountMinor: booking.shares[1].amountMinor })])
    expect((await api('post', `/shares/${invite}/claim`, undefined, 'second')).status).toBe(422)
  })

  it('lists shared bookings with shares left, for anyone to find and join', async () => {
    const booking = (await api('post', `/boards/${boardId}/bookings`, { startsOn: fromToday(130), periods: 1, shares: 3 })).body.data
    const listed = (await api('get', `/shares/open?boardId=${boardId}`, undefined, 'third')).body.data.find((entry: { id: string }) => entry.id === booking.id)

    expect(listed).toMatchObject({ count: 3, openCount: 2, paidCount: 0, organiser: 'Shares organiser', takeoverOpen: false, joined: false, board: { id: boardId } })
    expect(listed.shareAmountMinor).toBe(booking.shares[1].amountMinor)
    expect((await api('post', `/bookings/${booking.id}/shares/join`, undefined, 'third')).body.data.shares[1]).toMatchObject({ status: 'claimed', mine: true })
    expect((await api('post', `/bookings/${booking.id}/shares/join`, undefined, 'third')).status).toBe(422)
    expect((await api('get', `/shares/open?boardId=${boardId}`, undefined, 'buyer')).body.data.find((entry: { id: string }) => entry.id === booking.id)).toMatchObject({ openCount: 1 })
  })

  it('keeps the board for the sharers while locked, then puts it up for bids and gives it to the winner', async () => {
    const booking = (await api('post', `/boards/${boardId}/bookings`, { startsOn: fromToday(200), periods: 1, shares: 2 })).body.data

    await api('post', `/bookings/${booking.id}/shares/join`, undefined, 'second')

    const share = await pay(booking.id, 'second')
    const bid = (amountMinor: number, who: string) => api('post', `/bookings/${booking.id}/takeover`, { amountMinor }, who)

    expect((await bid(booking.amountMinor, 'buyer')).status).toBe(422)
    expect((await api('get', `/bookings/${booking.id}`)).body.data.sharing).toMatchObject({ takeoverOpen: false, auction: null })

    ark('db', `update bookings set "createdAt" = now() - interval '25 hours' where id = '${booking.id}'`)

    expect((await api('get', `/bookings/${booking.id}`)).body.data.sharing).toMatchObject({ takeoverOpen: true })
    expect((await bid(booking.amountMinor, 'second')).status).toBe(422)
    expect((await bid(booking.amountMinor - 1, 'buyer')).status).toBe(422)

    const first = await bid(booking.amountMinor, 'buyer')

    expect(first.status).toBe(200)
    expect(first.body.data).toMatchObject({ status: 'open', takeoverOf: booking.id, reserveMinor: booking.amountMinor, highestMinor: booking.amountMinor, myBid: { leading: true } })

    const winning = Math.ceil(first.body.data.nextMinimumMinor / 100) * 100

    expect((await bid(winning, 'third')).status).toBe(200)
    expect((await api('get', `/boards/${boardId}/auctions`, undefined, 'third')).body.data.some((entry: { takeoverOf: string | null }) => entry.takeoverOf === booking.id)).toBe(false)
    expect((await api('get', `/shares/open?boardId=${boardId}`, undefined, 'buyer')).body.data.find((entry: { id: string }) => entry.id === booking.id).auction).toMatchObject({ highestMinor: winning, bidCount: 2 })
    expect((await api('post', `/bookings/${booking.id}/takeover/checkout`, undefined, 'third')).status).toBe(403)

    ark('db', `update auctions set closes_at = now() - interval '1 minute' where shared_booking_id = '${booking.id}'`)
    ark('bids:settle')

    expect((await api('post', `/bookings/${booking.id}/takeover/checkout`, undefined, 'buyer')).status).toBe(403)

    const started = await api('post', `/bookings/${booking.id}/takeover/checkout`, undefined, 'third')

    expect(started.status).toBe(201)
    expect(started.body.data.amountMinor).toBe(winning)
    await api('post', `/payments/${started.body.data.reference}/verify`, undefined, 'third')

    const taken = (await api('get', `/bookings/${booking.id}`, undefined, 'third')).body.data

    expect(taken).toMatchObject({ status: 'paid', shared: false, amountMinor: winning })
    expect((await api('get', `/bookings/${booking.id}`, undefined, 'second')).status).toBe(404)
    expect(ark('db', `select status from auctions where shared_booking_id = '${booking.id}'`)).toContain('sold')
    expect(ark('db', `select sum(amount_minor) from ledger_entries where booking_id = '${booking.id}' and account = 'escrow'`)).toContain(String(winning))
    expect(ark('db', `select count(*) from refunds where booking_id = '${booking.id}' and amount_minor = ${share.amountMinor}`)).toMatch(/\b1\b/)
  })

  it('ends the bidding when the sharers pay every share first', async () => {
    const booking = (await api('post', `/boards/${boardId}/bookings`, { startsOn: fromToday(230), periods: 1, shares: 2 })).body.data

    ark('db', `update bookings set "createdAt" = now() - interval '25 hours' where id = '${booking.id}'`)

    expect((await api('post', `/bookings/${booking.id}/takeover`, { amountMinor: booking.amountMinor }, 'buyer')).status).toBe(200)
    expect((await api('post', `/bookings/${booking.id}/shares/cover`)).status).toBe(200)

    await pay(booking.id, 'organiser')

    const kept = (await api('get', `/bookings/${booking.id}`)).body.data

    expect(kept).toMatchObject({ status: 'paid', shared: true, sharing: { takeoverOpen: false, auction: null } })
    expect(ark('db', `select status from auctions where shared_booking_id = '${booking.id}'`)).toContain('unsold')
    expect(ark('db', `select b.status from bids b join auctions a on a.id = b.auction_id where a.shared_booking_id = '${booking.id}'`)).toContain('lost')
  })
})
