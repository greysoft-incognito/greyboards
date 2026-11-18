import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'
import { ark } from './support/ark'

const tokens: Record<string, string> = {}

const api = (method: 'get' | 'post' | 'put', path: string, body?: Record<string, unknown>, as: string | null = 'advertiser') => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

const ledger = (bookingId: string) =>
  ark('db', `select account || ' ' || kind || ' ' || amount_minor as line from ledger_entries where booking_id = '${bookingId}' and kind <> 'paid_out' order by "createdAt", account`)
    .split('\n')
    .map((row) => row.replace(/\|/g, '').trim())
    .filter((row) => /^[a-z]+ [a-z_]+ -?\d+$/.test(row))

/** 'YYYY-MM-DD', `days` from today. */
const fromToday = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)

describe('Disputes', { timeout: 60_000 }, () => {
  let boardId = ''
  let first = ''

  /** A paid one-month booking from `startsOn` (₦400,000 rent, plus printing). */
  const paidBooking = async (startsOn: string) => {
    const held = (await api('post', `/boards/${boardId}/bookings`, { startsOn, periods: 1 })).body.data
    const payment = (await api('post', `/bookings/${held.id}/checkout`)).body.data

    await api('post', `/payments/${payment.reference}/verify`)

    return held.id as string
  }

  beforeAll(async () => {
    for (const who of ['advertiser', 'owner', 'outsider', 'admin']) {
      const email = `disputes-${who}-${Date.now()}@greyboards.test`
      const register = await api('post', '/auth/register', { name: `Disputing ${who}`, email, password: 'password123', roles: [who === 'owner' ? 'owner' : 'advertiser'] }, null)

      tokens[who] = register.body.data.token

      if (who === 'admin') ark('users:role', email, 'admin')
    }

    const board = { name: 'Disputed board', kind: 'billboard', widthM: 12, heightM: 4, latitude: 9.4 + Math.random() / 100, longitude: 5.6, rateMinor: 40_000_000, as: 'owner' }

    boardId = (await api('post', '/account/boards', board, 'owner')).body.data.id
    await api('put', `/admin/boards/${boardId}`, { status: 'listed' }, 'admin')
  }, 60_000)

  it('lets anyone on a paid booking raise one dispute at a time', async () => {
    const held = (await api('post', `/boards/${boardId}/bookings`, { startsOn: fromToday(100), periods: 1 })).body.data
    const raise = { reason: 'not_up', details: 'The board still shows last month’s ad.' }

    expect((await api('post', `/bookings/${held.id}/disputes`, raise)).status).toBe(422)

    first = await paidBooking(fromToday(20))

    expect((await api('post', `/bookings/${first}/disputes`, raise, 'outsider')).status).toBe(404)
    expect((await api('post', `/bookings/${first}/disputes`, { ...raise, reason: 'bored' })).status).toBe(422)

    const raised = await api('post', `/bookings/${first}/disputes`, raise)

    expect(raised.status).toBe(201)
    expect(raised.body.data).toMatchObject({ side: 'advertiser', reason: 'not_up', status: 'open', openedBy: 'Disputing advertiser' })
    expect((await api('post', `/bookings/${first}/disputes`, raise, 'owner')).status).toBe(422)

    const seen = (await api('get', `/bookings/${first}`, undefined, 'owner')).body.data

    expect(seen.dispute).toMatchObject({ latest: { status: 'open', reasonLabel: 'The ad isn’t up' }, canOpen: false, answerHours: 48 })

    const messages = (await api('get', `/bookings/${first}/messages`, undefined, 'owner')).body.data

    expect(messages[0].body).toMatch(/^Raised a dispute: The ad isn’t up\./)
  })

  it('keeps the money in escrow while the dispute is open', async () => {
    ark('db', `update bookings set artwork_status = 'approved', proof_status = 'submitted', proof_submitted_at = now() - interval '30 days' where id = '${first}'`)
    ark('bookings:settle')

    const booking = (await api('get', `/bookings/${first}`)).body.data

    expect(booking.status).toBe('paid')
    expect(booking.proof.acceptsAt).toBeNull()
  })

  it('lets staff decide it, moving the money and recording the decision', async () => {
    expect((await api('get', '/admin/disputes', undefined, 'owner')).status).toBe(403)

    const open = (await api('get', '/admin/disputes', undefined, 'admin')).body.data
    const dispute = open.find((item: { booking: { id: string } }) => item.booking.id === first)

    expect(dispute.booking).toMatchObject({ inEscrow: true, board: { name: 'Disputed board' } })
    expect((await api('post', `/admin/disputes/${dispute.id}/resolve`, { decision: 'refund_part', resolution: 'Went up a week late.' }, 'admin')).status).toBe(422)

    const decided = await api('post', `/admin/disputes/${dispute.id}/resolve`, { decision: 'refund_part', refund: 100_000, resolution: 'Went up a week late.' }, 'admin')

    expect(decided.status).toBe(200)
    expect(decided.body.data).toMatchObject({ status: 'resolved', decision: 'refund_part', refundMinor: 10_000_000, resolvedBy: 'Disputing admin' })
    expect((await api('post', `/admin/disputes/${dispute.id}/resolve`, { decision: 'dismiss', resolution: 'Again.' }, 'admin')).status).toBe(409)
    expect(ledger(first)).toEqual(expect.arrayContaining(['refund refund_due 10000000', 'escrow dispute_decided 0']))

    const booking = (await api('get', `/bookings/${first}`)).body.data

    expect(booking).toMatchObject({ status: 'cancelled', dispute: { latest: { decision: 'refund_part' }, canOpen: false } })
    expect((await api('get', `/bookings/${first}/messages`)).body.data[0].body).toMatch(/^Dispute decided: Cancelled with part of the money back/)
  })

  it('can pay the board’s side, and closes disputes on released money without a change', async () => {
    const id = await paidBooking(fromToday(60))
    const raised = (await api('post', `/bookings/${id}/disputes`, { reason: 'payment', details: 'The ad is up but nobody has checked it.' }, 'owner')).body.data

    expect(raised.side).toBe('board')

    await api('post', `/admin/disputes/${raised.id}/resolve`, { decision: 'release', resolution: 'The photos show the ad up.' }, 'admin')

    expect((await api('get', `/bookings/${id}`)).body.data.status).toBe('live')
    expect(ledger(id)).toContain('escrow release -' + ledger(id).find((line) => line.startsWith('escrow payment_in'))!.split(' ')[2])

    const again = (await api('post', `/bookings/${id}/disputes`, { reason: 'taken_down', details: 'The ad came down after two days.' })).body.data

    expect((await api('post', `/admin/disputes/${again.id}/resolve`, { decision: 'refund_full', resolution: 'Refund it.' }, 'admin')).status).toBe(422)
    expect((await api('post', `/admin/disputes/${again.id}/resolve`, { decision: 'dismiss', resolution: 'Back up the same day.' }, 'admin')).body.data.decision).toBe('dismiss')
  })
})
