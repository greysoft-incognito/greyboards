import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'
import { passChecks } from './support/partner'
import { ark } from './support/ark'

const tokens: Record<string, string> = {}
const ids: Record<string, string> = {}

const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: Record<string, unknown>, as: string | null = 'advertiser') => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

const upload = (path: string, field: string, as: string) => {
  const form = new FormData()

  form.append(field, new Blob([pixel], { type: 'image/png' }), 'image.png')

  return request(app).post(`/api${path}`).set({ Accept: 'application/json', Authorization: `Bearer ${tokens[as]}` }).send(form)
}

const sql = (statement: string) => ark('db', statement)

describe('Artwork and print jobs', () => {
  const latitude = 4.8 + Math.random() / 100
  const longitude = 7.0
  let bookingId = ''
  let jobId = ''

  beforeAll(async () => {
    for (const who of ['advertiser', 'owner', 'reviewer', 'poster', 'rival']) {
      const email = `print-${who}-${Date.now()}@greyboards.test`
      const roles = who === 'owner' ? ['owner'] : who === 'poster' || who === 'rival' ? ['dispatch'] : ['advertiser']
      const register = await api('post', '/auth/register', { name: `Print ${who}`, email, password: 'password123', roles }, null)

      tokens[who] = register.body.data.token
      ids[who] = register.body.data.user.id

      if (who === 'reviewer') ark('users:role', email, 'reviewer')
    }

    for (const who of ['poster', 'rival']) {
      const role = (await api('get', '/account/roles', undefined, who)).body.data[0]

      await passChecks(tokens[who])
      await api('put', `/admin/account-roles/${role.id}`, { status: 'active' }, 'reviewer')
    }

    const board = (await api('post', '/account/boards', { name: 'Aba Road', kind: 'billboard', widthM: 10, heightM: 5, latitude, longitude, rateMinor: 50_000_000, as: 'owner' }, 'owner')).body.data

    await api('put', `/admin/boards/${board.id}`, { status: 'listed' }, 'reviewer')

    const held = (await api('post', `/boards/${board.id}/bookings`, { startsOn: '2027-08-01', periods: 1 })).body.data
    const payment = (await api('post', `/bookings/${held.id}/checkout`)).body.data

    await api('post', `/payments/${payment.reference}/verify`)
    bookingId = held.id
  }, 90_000)

  it('has the owner check the artwork, sending it back with a note or approving it for print', async () => {
    expect((await upload(`/bookings/${bookingId}/artwork`, 'artwork', 'owner')).status).toBe(403)
    expect((await upload(`/bookings/${bookingId}/artwork`, 'artwork', 'advertiser')).body.data.artwork).toMatchObject({ status: 'submitted', width: 1, height: 1 })
    expect((await api('post', `/bookings/${bookingId}/artwork/review`, { decision: 'approve' })).status).toBe(403)
    expect((await api('post', `/bookings/${bookingId}/artwork/review`, { decision: 'reject' }, 'owner')).status).toBe(422)

    const rejected = await api('post', `/bookings/${bookingId}/artwork/review`, { decision: 'reject', note: 'Make the phone number bigger.' }, 'owner')

    expect(rejected.body.data.artwork).toMatchObject({ status: 'rejected', note: 'Make the phone number bigger.' })
    expect(rejected.body.data.printJob).toBeNull()

    await upload(`/bookings/${bookingId}/artwork`, 'artwork', 'advertiser')

    expect((await api('get', `/bookings/${bookingId}`, undefined, 'owner')).body.data.artwork.canReview).toBe(true)
    expect((await api('get', `/bookings/${bookingId}`, undefined, 'advertiser')).body.data.artwork.canReview).toBe(false)

    const approved = await api('post', `/bookings/${bookingId}/artwork/review`, { decision: 'approve' }, 'owner')

    // No price yet: dispatchers send theirs.
    expect(approved.body.data).toMatchObject({ printFeeMinor: 0, amountMinor: 50_000_000, printJob: { status: 'open', priced: false, dueOn: '2027-08-01' } })
    expect((await upload(`/bookings/${bookingId}/artwork`, 'artwork', 'advertiser')).status).toBe(422)

    jobId = approved.body.data.printJob.id
  })

  it('lets dispatchers send prices on nearby jobs, and the advertiser ask one at their rate', async () => {
    const near = await api('get', `/print-jobs?lat=${latitude + 0.01}&lng=${longitude}`, undefined, 'poster')
    const job = near.body.data.find((entry: { id: string }) => entry.id === jobId)

    expect(job).toMatchObject({ status: 'open', priced: false, feeMinor: 0, mine: false, myOffer: null, artworkUrl: null, board: { name: 'Aba Road' } })
    expect(job.distanceM).toBeGreaterThan(1000)
    expect((await api('get', `/print-jobs?lat=${latitude + 2}&lng=${longitude}`, undefined, 'poster')).body.data.map((entry: { id: string }) => entry.id)).not.toContain(jobId)
    expect((await api('get', `/print-jobs?lat=${latitude}&lng=${longitude}`)).status).toBe(403)
    expect((await api('post', `/print-jobs/${jobId}/reserve`, undefined, 'poster')).status).toBe(422)

    const bid = await api('post', `/print-jobs/${jobId}/offers`, { amountMinor: 16_000_000, note: 'Flex, printed in Port Harcourt' }, 'poster')

    expect(bid.status).toBe(201)
    expect(bid.body.data).toMatchObject({ kind: 'bid', status: 'pending', amountMinor: 16_000_000 })
    expect((await api('post', `/print-jobs/${jobId}/offers`, { amountMinor: 15_000_000 }, 'poster')).body.data).toMatchObject({ id: bid.body.data.id, amountMinor: 15_000_000 })
    expect((await api('get', `/print-jobs/${jobId}`, undefined, 'poster')).body.data.myOffer).toMatchObject({ amountMinor: 15_000_000 })

    // The rival works within 30 km of a base near the board, at ₦3,000 per m² with a ₦200,000 minimum.
    expect((await api('get', '/account/dispatch-rate', undefined, 'rival')).body.data).toMatchObject({ saved: false, pricePerSqmMinor: 350_000 })
    expect((await api('put', '/account/dispatch-rate', { pricePerSqmMinor: 300_000, minFeeMinor: 20_000_000, latitude: latitude + 0.05, longitude, radiusKm: 30 }, 'rival')).body.data).toMatchObject({ saved: true, radiusKm: 30 })

    const options = (await api('get', `/bookings/${bookingId}/print-offers`)).body.data
    const rival = options.dispatchers.find((entry: { id: string }) => entry.id === ids.rival)

    expect(options).toMatchObject({ open: true, offers: [{ amountMinor: 15_000_000, dispatcher: { id: ids.poster } }] })
    expect(rival).toMatchObject({ quoteMinor: 20_000_000, asked: false })
    expect((await api('get', `/bookings/${bookingId}/print-offers`, undefined, 'owner')).status).toBe(403)

    const asked = await api('post', `/bookings/${bookingId}/print-requests`, { dispatcherId: rival.id })

    expect(asked.body.data).toMatchObject({ kind: 'request', status: 'requested', amountMinor: 20_000_000 })
    expect((await api('post', `/bookings/${bookingId}/print-requests`, { dispatcherId: rival.id })).status).toBe(409)
    expect((await api('post', `/bookings/${bookingId}/print-offers/${asked.body.data.id}/checkout`)).status).toBe(422)
    expect((await api('post', `/print-offers/${asked.body.data.id}/accept`, undefined, 'poster')).status).toBe(404)
    expect((await api('post', `/print-offers/${asked.body.data.id}/accept`, undefined, 'rival')).body.data.status).toBe('pending')
    expect((await api('get', '/account/print-offers', undefined, 'rival')).body.data[0]).toMatchObject({ kind: 'request', job: { boardName: 'Aba Road', dueOn: '2027-08-01' } })
  })

  it('gives the job to the dispatcher whose price the advertiser pays', async () => {
    const offers = (await api('get', `/bookings/${bookingId}/print-offers`)).body.data.offers

    expect(offers.map((offer: { amountMinor: number }) => offer.amountMinor)).toEqual([15_000_000, 20_000_000])

    const payment = (await api('post', `/bookings/${bookingId}/print-offers/${offers[0].id}/checkout`)).body.data

    expect(payment.amountMinor).toBe(15_000_000)
    await api('post', `/payments/${payment.reference}/verify`)

    const booking = (await api('get', `/bookings/${bookingId}`)).body.data

    expect(booking).toMatchObject({ printFeeMinor: 15_000_000, amountMinor: 65_000_000, printJob: { status: 'confirmed', priced: true } })
    expect(sql(`select sum(amount_minor) from ledger_entries where booking_id = '${bookingId}' and account = 'escrow'`)).toContain('65000000')
    expect((await api('get', `/print-jobs/${jobId}`, undefined, 'poster')).body.data).toMatchObject({ status: 'confirmed', mine: true, feeMinor: 15_000_000 })
    expect((await api('get', '/account/print-offers', undefined, 'rival')).body.data[0].status).toBe('closed')
    expect((await api('get', `/bookings/${bookingId}/print-offers`)).body.data).toMatchObject({ open: false, offers: [], dispatchers: [] })
    expect((await api('post', `/bookings/${bookingId}/print-offers/${offers[1].id}/checkout`)).status).toBe(422)
  })

  it('takes a photo of the print from the dispatcher on the job', async () => {
    expect((await api('get', `/print-jobs/${jobId}`, undefined, 'rival')).status).toBe(404)
    expect((await upload(`/print-jobs/${jobId}/print-photo`, 'photo', 'rival')).status).toBe(422)

    const printed = await upload(`/print-jobs/${jobId}/print-photo`, 'photo', 'poster')

    expect(printed.body.data.status).toBe('printed')
    expect(printed.body.data.printPhotoUrl).toBeTruthy()
    expect((await api('post', `/print-jobs/${jobId}/release`, undefined, 'poster')).status).toBe(422)
    expect((await api('get', '/account/print-jobs', undefined, 'poster')).body.data.map((entry: { id: string }) => entry.id)).toContain(jobId)
    expect((await api('get', `/bookings/${bookingId}`)).body.data.printJob).toMatchObject({ status: 'printed' })
  })
})
