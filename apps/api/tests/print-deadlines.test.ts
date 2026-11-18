import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'
import { passChecks } from './support/partner'
import { ark } from './support/ark'
import { takeJob } from './support/dispatch'

const tokens: Record<string, string> = {}

const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

const api = (method: 'get' | 'post' | 'put', path: string, body?: Record<string, unknown>, as: string | null = 'advertiser') => {
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

const check = () => ark('print-jobs:check')

const ledger = (bookingId: string) =>
  sql(`select account || ' ' || amount_minor as line from ledger_entries where booking_id = '${bookingId}' and kind <> 'paid_out' order by \"createdAt\", account`)
    .split('\n')
    .map((row) => row.replace(/\|/g, '').trim())
    .filter((row) => /^[a-z]+ -?\d+$/.test(row))

describe('Print deadlines', () => {
  const latitude = 6.2 + Math.random() / 100
  const longitude = 6.7
  const at = (offset: number) => ({ latitude: latitude + offset + 5 / 111_320, longitude, accuracyM: 8 })
  let first = { booking: '', job: '' }
  let second = { booking: '', job: '' }

  /** A paid, approved booking on a new 10 × 5 m board, with its open print job. */
  const approvedBooking = async (offset: number) => {
    const board = (await api('post', '/account/boards', { name: 'Deadline board', kind: 'billboard', widthM: 10, heightM: 5, latitude: latitude + offset, longitude, rateMinor: 50_000_000, as: 'owner' }, 'owner')).body.data

    await api('put', `/admin/boards/${board.id}`, { status: 'listed' }, 'reviewer')

    const held = (await api('post', `/boards/${board.id}/bookings`, { startsOn: '2027-11-01', periods: 1 })).body.data
    const payment = (await api('post', `/bookings/${held.id}/checkout`)).body.data

    await api('post', `/payments/${payment.reference}/verify`)
    await upload(`/bookings/${held.id}/artwork`, 'artwork', 'advertiser')

    const approved = (await api('post', `/bookings/${held.id}/artwork/review`, { decision: 'approve' }, 'owner')).body.data

    return { booking: held.id as string, job: approved.printJob.id as string }
  }

  /** Have `who` take the job, and move its go-live to `days` from today. With the print photo due a day before go-live, 0 is already late. */
  const take = async ({ job, booking }: { job: string; booking: string }, who: string, days: number) => {
    await takeJob(api, job, booking, who)
    sql(`update print_jobs set due_on = current_date + ${days} where id = '${job}'`)
  }

  beforeAll(async () => {
    for (const who of ['advertiser', 'owner', 'reviewer', 'poster', 'rival']) {
      const email = `deadline-${who}-${Date.now()}@greyboards.test`
      const roles = who === 'owner' ? ['owner'] : ['poster', 'rival'].includes(who) ? ['dispatch'] : ['advertiser']
      const register = await api('post', '/auth/register', { name: `Deadline ${who}`, email, password: 'password123', roles }, null)

      tokens[who] = register.body.data.token

      if (who === 'reviewer') ark('users:role', email, 'reviewer')
    }

    for (const who of ['poster', 'rival']) {
      const role = (await api('get', '/account/roles', undefined, who)).body.data[0]

      await passChecks(tokens[who])
      await api('put', `/admin/account-roles/${role.id}`, { status: 'active' }, 'reviewer')
    }

    first = await approvedBooking(0)
    second = await approvedBooking(0.05)
  }, 120_000)

  it('takes a job back from a dispatcher who misses the print date, with a rush bonus, and warns the owner', async () => {
    await take(first, 'poster', 0)
    expect((await api('get', `/print-jobs/${first.job}`, undefined, 'poster')).body.data).toMatchObject({ status: 'confirmed', printBy: expect.any(String) })

    expect(check()).toMatch(/Took back [1-9]\d* missed/)

    // ₦175,000 to print 10 × 5 m, and a 25% rush bonus because go-live is today.
    const job = (await api('get', `/print-jobs/${first.job}`, undefined, 'rival')).body.data

    expect(job).toMatchObject({ status: 'open', mine: false, bonusMinor: 4_375_000, feeMinor: 21_875_000 })
    expect(sql(`select count(*) from print_job_misses where print_job_id = '${first.job}'`)).toMatch(/\b1\b/)
    expect(sql(`select unclaimed_alert_at is not null as alerted from print_jobs where id = '${first.job}'`)).toMatch(/\bt\b|true/)
  }, 30_000)

  it('lets whoever looks after the board step in on a job nobody holds', async () => {
    const proof = await upload(`/bookings/${first.booking}/proofs`, 'photo', 'owner', at(0))

    expect(proof.status).toBe(201)

    const seen = (await api('get', `/bookings/${first.booking}`, undefined, 'owner')).body.data

    expect(seen).toMatchObject({ printedBy: 'owner', printJob: { status: 'cancelled' } })
    expect((await api('post', `/print-jobs/${first.job}/reserve`, undefined, 'rival')).status).toBe(409)
  })

  it('suspends a dispatcher who misses too often, and pays the bonus to whoever finishes the job', async () => {
    sql(`insert into print_job_misses (id, print_job_id, billposter_id, stage, "createdAt", "updatedAt") select gen_random_uuid(), '${first.job}', billposter_id, 'print', now(), now() from print_job_misses where print_job_id = '${first.job}'`)
    await take(second, 'poster', 0)
    check()

    expect((await api('get', '/account/roles', undefined, 'poster')).body.data[0]).toMatchObject({ kind: 'dispatch', status: 'suspended' })
    expect((await api('post', `/print-jobs/${second.job}/reserve`, undefined, 'poster')).status).toBe(403)

    await take(second, 'rival', 2)
    await upload(`/print-jobs/${second.job}/print-photo`, 'photo', 'rival')

    for (const metres of [0, 0.00002]) await upload(`/bookings/${second.booking}/proofs`, 'photo', 'rival', at(0.05 + metres))

    await api('post', `/bookings/${second.booking}/proof/submit`, undefined, 'rival')
    await api('post', `/bookings/${second.booking}/proof/accept`)

    // Greyboards' ₦100,000 share pays the ₦43,750 bonus.
    expect(ledger(second.booking).sort()).toEqual(['dispatch 21875000', 'escrow -67500000', 'escrow 50000000', 'escrow 17500000', 'owner 40000000', 'platform 5625000'].sort())
  }, 60_000)
})
