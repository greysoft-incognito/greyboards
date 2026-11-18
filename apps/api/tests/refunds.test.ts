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
  ark('db', `select account || ' ' || kind || ' ' || amount_minor as line from ledger_entries where booking_id = '${bookingId}' and kind <> 'paid_out' order by \"createdAt\", account`)
    .split('\n')
    .map((row) => row.replace(/\|/g, '').trim())
    .filter((row) => /^[a-z]+ [a-z_]+ -?\d+$/.test(row))

/** 'YYYY-MM-DD', `days` from today. */
const fromToday = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)

describe('Cancellations and refunds', { timeout: 30_000 }, () => {
  const latitude = 9.05 + Math.random() / 100
  const longitude = 7.49
  let boardId = ''

  /** A paid booking of one month from `startsOn` on the test board (₦500,000 rent, ₦175,000 for the owner to print). */
  const paidBooking = async (startsOn: string) => {
    const held = (await api('post', `/boards/${boardId}/bookings`, { startsOn, periods: 1 })).body.data
    const payment = (await api('post', `/bookings/${held.id}/checkout`)).body.data

    await api('post', `/payments/${payment.reference}/verify`)

    return held.id as string
  }

  beforeAll(async () => {
    for (const who of ['advertiser', 'owner', 'admin']) {
      const email = `refund-${who}-${Date.now()}@greyboards.test`
      const register = await api('post', '/auth/register', { name: `Refund ${who}`, email, password: 'password123', roles: [who === 'owner' ? 'owner' : 'advertiser'] }, null)

      tokens[who] = register.body.data.token

      if (who === 'admin') ark('users:role', email, 'admin')
    }

    boardId = (await api('post', '/account/boards', { name: 'Refund board', kind: 'billboard', widthM: 10, heightM: 5, latitude, longitude, rateMinor: 50_000_000, printsOwn: true, printFeeMinor: 17_500_000, as: 'owner' }, 'owner')).body.data.id
    await api('put', `/admin/boards/${boardId}`, { status: 'listed' }, 'admin')
  }, 60_000)

  it('gives everything back for an early cancellation and frees the dates', async () => {
    const id = await paidBooking(fromToday(40))
    const before = (await api('get', `/bookings/${id}`)).body.data

    expect(before.cancellation).toEqual({ allowed: true, reason: null, refundMinor: 67_500_000, full: true })
    expect((await api('get', `/bookings/${id}`, undefined, 'owner')).body.data.cancellation).toBeNull()
    expect((await api('post', `/bookings/${id}/cancel`, undefined, 'owner')).status).toBe(403)

    const cancelled = await api('post', `/bookings/${id}/cancel`)

    expect(cancelled.body.message).toMatch(/675,000.*on its way back/)
    expect(cancelled.body.data).toMatchObject({ status: 'cancelled', refunds: [{ amountMinor: 67_500_000, status: 'refunded' }] })
    expect(ledger(id)).toEqual(['escrow payment_in 67500000', 'escrow cancelled -67500000', 'refund refund_due 67500000', 'refund refunded -67500000'])
    expect((await api('post', `/boards/${boardId}/bookings`, { startsOn: fromToday(40), periods: 1 })).status).toBe(201)
  })

  it('keeps part of the rent for a late cancellation and shares it by the split', async () => {
    const id = await paidBooking(fromToday(80))

    ark('db', `update bookings set starts_on = current_date + 4, ends_on = current_date + 34 where id = '${id}'`)

    const quote = (await api('get', `/bookings/${id}`)).body.data.cancellation

    // Half the ₦500,000 rent, plus the ₦175,000 print fee since nothing was printed.
    expect(quote).toEqual({ allowed: true, reason: null, refundMinor: 42_500_000, full: false })

    await api('post', `/bookings/${id}/cancel`)

    expect(ledger(id).sort()).toEqual(
      ['escrow payment_in 67500000', 'escrow cancelled -67500000', 'refund refund_due 42500000', 'owner payout_due 20000000', 'platform commission 5000000', 'refund refunded -42500000'].sort(),
    )
    expect((await api('post', `/bookings/${id}/cancel`)).status).toBe(422)
  })

  it('lets staff refund a paid booking in full', async () => {
    const id = await paidBooking(fromToday(120))

    expect((await api('post', `/admin/bookings/${id}/refund`, { reason: 'Board was taken down' }, 'owner')).status).toBe(403)
    expect((await api('post', `/admin/bookings/${id}/refund`, { reason: '' }, 'admin')).status).toBe(422)

    const refunded = await api('post', `/admin/bookings/${id}/refund`, { reason: 'Board was taken down' }, 'admin')

    expect(refunded.body.data).toMatchObject({ status: 'cancelled', refunds: [{ amountMinor: 67_500_000, status: 'refunded', reason: 'Board was taken down' }] })
    expect((await api('post', `/admin/bookings/${id}/refund`, { reason: 'Again please' }, 'admin')).status).toBe(422)
  })
})
