import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'
import { passChecks } from './support/partner'
import { ark } from './support/ark'

const tokens: Record<string, string> = {}

const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

const api = (method: 'get' | 'post' | 'put', path: string, body?: Record<string, unknown>, as: string | null = 'advertiser') => {
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
      const roles = who === 'owner' ? ['owner'] : who === 'poster' || who === 'rival' ? ['billposter'] : ['advertiser']
      const register = await api('post', '/auth/register', { name: `Print ${who}`, email, password: 'password123', roles }, null)

      tokens[who] = register.body.data.token

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

    // 10 × 5 m at ₦3,500 per m².
    expect(approved.body.data.printJob).toMatchObject({ status: 'open', dueOn: '2027-08-01' })
    expect((await upload(`/bookings/${bookingId}/artwork`, 'artwork', 'advertiser')).status).toBe(422)

    jobId = approved.body.data.printJob.id
  })

  it('shows billposters nearby jobs, and the artwork only once they reserve one', async () => {
    const near = await api('get', `/print-jobs?lat=${latitude + 0.01}&lng=${longitude}`, undefined, 'poster')
    const job = near.body.data.find((entry: { id: string }) => entry.id === jobId)

    expect(job).toMatchObject({ status: 'open', feeMinor: 17_500_000, mine: false, artworkUrl: null, board: { name: 'Aba Road' } })
    expect(job.distanceM).toBeGreaterThan(1000)
    expect((await api('get', `/print-jobs?lat=${latitude + 2}&lng=${longitude}`, undefined, 'poster')).body.data.map((entry: { id: string }) => entry.id)).not.toContain(jobId)
    expect((await api('get', `/print-jobs?lat=${latitude}&lng=${longitude}`)).status).toBe(403)

    const reserved = await api('post', `/print-jobs/${jobId}/reserve`, undefined, 'poster')

    expect(reserved.body.data).toMatchObject({ status: 'reserved', mine: true, bookedDays: { startsOn: '2027-08-01', endsOn: '2027-08-31' } })
    expect(reserved.body.data.artworkUrl).toBeTruthy()
    expect((await api('post', `/print-jobs/${jobId}/reserve`, undefined, 'rival')).status).toBe(409)
    expect((await api('get', `/print-jobs?lat=${latitude}&lng=${longitude}`, undefined, 'rival')).body.data.map((entry: { id: string }) => entry.id)).not.toContain(jobId)
  })

  it('lets the job go back when a hold runs out', async () => {
    sql(`update print_jobs set reserved_until = now() - interval '1 minute' where id = '${jobId}'`)

    expect((await api('post', `/print-jobs/${jobId}/confirm`, undefined, 'poster')).status).toBe(422)
    expect((await api('post', `/print-jobs/${jobId}/reserve`, undefined, 'rival')).body.data.mine).toBe(true)
    expect((await api('post', `/print-jobs/${jobId}/release`, undefined, 'rival')).body.data.status).toBe('open')
  })

  it('makes the job the billposter’s once confirmed, then takes a photo of the print', async () => {
    await api('post', `/print-jobs/${jobId}/reserve`, undefined, 'poster')

    expect((await api('post', `/print-jobs/${jobId}/confirm`, undefined, 'poster')).body.data.status).toBe('confirmed')
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
