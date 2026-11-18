import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'
import { passChecks } from './support/partner'
import { ark } from './support/ark'

const tokens: Record<string, string> = {}

const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: Record<string, unknown>, as: string | null = 'advertiser') => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

const upload = (path: string, field: string, as: string, fields: Record<string, number> = {}) => {
  const form = new FormData()

  form.append(field, new Blob([pixel], { type: 'image/png' }), 'image.png')

  for (const [key, value] of Object.entries(fields)) form.append(key, String(value))

  return request(app).post(`/api${path}`).set({ Accept: 'application/json', Authorization: `Bearer ${tokens[as]}` }).send(form)
}

const sql = (statement: string) => ark('db', statement)


const settle = () => ark('bookings:settle')

/** The ledger lines of a booking, as "account amount" rows. */
const ledger = (bookingId: string) =>
  sql(`select account || ' ' || amount_minor as line from ledger_entries where booking_id = '${bookingId}' and kind <> 'paid_out' order by \"createdAt\", account`)
    .split('\n')
    .map((row) => row.replace(/\|/g, '').trim())
    .filter((row) => /^[a-z]+ -?\d+$/.test(row))

describe('Proof of posting', () => {
  const latitude = 5.1 + Math.random() / 100
  const longitude = 7.3
  const at = (metres: number) => ({ latitude: latitude + metres / 111_320, longitude, accuracyM: 8 })
  let printed = ''
  let digital = ''
  let jobId = ''

  /** A paid, approved booking on a new board of `kind` at the test spot. */
  const approvedBooking = async (kind: string, startsOn: string, offset: number, extra: Record<string, unknown> = {}) => {
    const board = (await api('post', '/account/boards', { name: `Proof ${kind}`, kind, widthM: 10, heightM: 5, latitude: latitude + offset, longitude, rateMinor: 50_000_000, as: 'owner', ...extra }, 'owner')).body.data

    await api('put', `/admin/boards/${board.id}`, { status: 'listed' }, 'reviewer')

    const held = (await api('post', `/boards/${board.id}/bookings`, { startsOn, periods: 1 })).body.data
    const payment = (await api('post', `/bookings/${held.id}/checkout`)).body.data

    await api('post', `/payments/${payment.reference}/verify`)
    await upload(`/bookings/${held.id}/artwork`, 'artwork', 'advertiser')

    return (await api('post', `/bookings/${held.id}/artwork/review`, { decision: 'approve' }, 'owner')).body.data
  }

  beforeAll(async () => {
    for (const who of ['advertiser', 'owner', 'reviewer', 'poster']) {
      const email = `proof-${who}-${Date.now()}@greyboards.test`
      const roles = who === 'owner' ? ['owner'] : who === 'poster' ? ['billposter'] : ['advertiser']
      const register = await api('post', '/auth/register', { name: `Proof ${who}`, email, password: 'password123', roles }, null)

      tokens[who] = register.body.data.token

      if (who === 'reviewer') ark('users:role', email, 'reviewer')
    }

    const role = (await api('get', '/account/roles', undefined, 'poster')).body.data[0]

    await passChecks(tokens.poster)
    await api('put', `/admin/account-roles/${role.id}`, { status: 'active' }, 'reviewer')

    const booking = await approvedBooking('billboard', '2027-09-01', 0)

    printed = booking.id
    jobId = booking.printJob.id
    digital = (await approvedBooking('digital', '2027-09-01', 0.05)).id

    await api('post', `/print-jobs/${jobId}/reserve`, undefined, 'poster')
    await api('post', `/print-jobs/${jobId}/confirm`, undefined, 'poster')
    await upload(`/print-jobs/${jobId}/print-photo`, 'photo', 'poster')
  }, 120_000)

  it('takes geotagged photos at the board from the billposter on the job', async () => {
    expect((await upload(`/bookings/${printed}/proofs`, 'photo', 'owner', at(10))).status).toBe(403)
    expect((await upload(`/bookings/${printed}/proofs`, 'photo', 'poster')).status).toBe(422)

    const far = await upload(`/bookings/${printed}/proofs`, 'photo', 'poster', at(400))

    expect(far.status).toBe(422)
    expect(far.body.message).toMatch(/taken 40\d m from the board/)

    const near = await upload(`/bookings/${printed}/proofs`, 'photo', 'poster', at(20))

    expect(near.status).toBe(201)
    expect(near.body.data.distanceM).toBeGreaterThan(15)
    expect(near.body.data.distanceM).toBeLessThan(25)
    expect((await api('post', `/bookings/${printed}/proof/submit`, undefined, 'poster')).status).toBe(422)

    const job = (await api('get', `/print-jobs/${jobId}`, undefined, 'poster')).body.data

    expect(job).toMatchObject({ bookingId: printed, proof: { status: 'none', canAdd: true, minPhotos: 2, maxDistanceM: 150 } })
    expect(job.proof.photos).toHaveLength(1)
  })

  it('sends the proof to the advertiser, who can send it back with a note', async () => {
    const extra = await upload(`/bookings/${printed}/proofs`, 'photo', 'poster', at(5))

    await upload(`/bookings/${printed}/proofs`, 'photo', 'poster', at(8))
    expect((await api('delete', `/bookings/${printed}/proofs/${extra.body.data.id}`, undefined, 'poster')).status).toBe(200)
    expect((await api('post', `/bookings/${printed}/proof/submit`, undefined, 'poster')).body.data).toMatchObject({ status: 'submitted', canAdd: false })
    expect((await upload(`/bookings/${printed}/proofs`, 'photo', 'poster', at(5))).status).toBe(422)

    const seen = (await api('get', `/bookings/${printed}`)).body.data

    expect(seen.printJob.status).toBe('posted')
    expect(seen.proof).toMatchObject({ status: 'submitted', canReview: true })
    expect(seen.proof.photos).toHaveLength(2)
    expect(new Date(seen.proof.acceptsAt).getTime() - new Date(seen.proof.submittedAt).getTime()).toBe(48 * 3_600_000)
    expect((await api('post', `/bookings/${printed}/proof/accept`, undefined, 'owner')).status).toBe(403)
    expect((await api('post', `/bookings/${printed}/proof/dispute`, { note: '' })).status).toBe(422)

    const disputed = await api('post', `/bookings/${printed}/proof/dispute`, { note: 'A tree hides the left side.' })

    expect(disputed.body.data.proof).toMatchObject({ status: 'disputed', note: 'A tree hides the left side.', canReview: false })
    expect(disputed.body.data.printJob.status).toBe('printed')
    expect(ledger(printed)).toEqual(['escrow 67500000'])
  })

  it('releases escrow to everyone when the advertiser accepts', async () => {
    await upload(`/bookings/${printed}/proofs`, 'photo', 'poster', at(3))
    await api('post', `/bookings/${printed}/proof/submit`, undefined, 'poster')

    const accepted = await api('post', `/bookings/${printed}/proof/accept`)

    expect(accepted.body.data).toMatchObject({ status: 'live', proof: { status: 'accepted' } })
    expect(accepted.body.data.releasedAt).toBeTruthy()
    expect((await api('post', `/bookings/${printed}/proof/accept`)).status).toBe(422)

    // ₦500,000 rent at 85/15, and ₦175,000 to print 10 × 5 m.
    expect(ledger(printed).sort()).toEqual(['billposter 17500000', 'escrow -67500000', 'escrow 67500000', 'owner 40000000', 'platform 10000000'].sort())
  })

  it('lets the owner prove a digital board, and accepts an unchecked proof after the deadline', async () => {
    expect((await upload(`/bookings/${digital}/proofs`, 'photo', 'poster', at(5))).status).toBe(403)

    for (const metres of [5, 12]) await upload(`/bookings/${digital}/proofs`, 'photo', 'owner', { ...at(metres), latitude: at(metres).latitude + 0.05 })

    expect((await api('post', `/bookings/${digital}/proof/submit`, undefined, 'owner')).body.data.status).toBe('submitted')

    settle()
    expect((await api('get', `/bookings/${digital}`)).body.data.status).toBe('paid')

    sql(`update bookings set proof_submitted_at = now() - interval '49 hours' where id = '${digital}'`)
    expect(settle()).toMatch(/Accepted [1-9]/)

    const done = (await api('get', `/bookings/${digital}`)).body.data

    expect(done).toMatchObject({ status: 'live', proof: { status: 'accepted' } })
    expect(ledger(digital).sort()).toEqual(['escrow -50000000', 'escrow 50000000', 'owner 40000000', 'platform 10000000'].sort())
  }, 30_000)

  it('lets an owner who prints their own board charge their price and take the fee', async () => {
    const booking = await approvedBooking('billboard', '2027-10-01', 0.1, { printsOwn: true, printFeeMinor: 10_000_000 })
    const spot = (metres: number) => ({ ...at(metres), latitude: at(metres).latitude + 0.1 })

    expect(booking).toMatchObject({ printedBy: 'owner', printFeeMinor: 10_000_000, amountMinor: 60_000_000, printJob: null })
    expect((await upload(`/bookings/${booking.id}/proofs`, 'photo', 'poster', spot(5))).status).toBe(403)

    for (const metres of [5, 12]) await upload(`/bookings/${booking.id}/proofs`, 'photo', 'owner', spot(metres))

    await api('post', `/bookings/${booking.id}/proof/submit`, undefined, 'owner')
    await api('post', `/bookings/${booking.id}/proof/accept`)

    expect(ledger(booking.id).sort()).toEqual(['escrow -60000000', 'escrow 60000000', 'owner 10000000', 'owner 40000000', 'platform 10000000'].sort())
  }, 30_000)
})
