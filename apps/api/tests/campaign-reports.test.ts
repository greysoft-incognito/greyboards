import { beforeAll, describe, expect, it } from 'vitest'

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

describe('Campaign reports', { timeout: 60_000 }, () => {
  const ran: string[] = []
  let held = ''
  let reportId = ''
  let link = ''

  beforeAll(async () => {
    for (const who of ['advertiser', 'owner', 'outsider', 'admin']) {
      const email = `reports-${who}-${Date.now()}@greyboards.test`
      const register = await api('post', '/auth/register', { name: `Reporting ${who}`, email, password: 'password123', roles: [who === 'owner' ? 'owner' : 'advertiser'] }, null)

      tokens[who] = register.body.data.token

      if (who === 'admin') ark('users:role', email, 'admin')
    }

    const board = { name: 'Reported board', kind: 'billboard', widthM: 12, heightM: 4, latitude: 9.9 + Math.random() / 100, longitude: 6.1, rateMinor: 20_000_000, as: 'owner' }
    const boardId = (await api('post', '/account/boards', board, 'owner')).body.data.id

    await api('put', `/admin/boards/${boardId}`, { status: 'listed' }, 'admin')

    for (const startsOn of [fromToday(10), fromToday(50)]) ran.push((await api('post', `/boards/${boardId}/bookings`, { startsOn, periods: 1 })).body.data.id)

    held = (await api('post', `/boards/${boardId}/bookings`, { startsOn: fromToday(90), periods: 1 })).body.data.id

    ark('db', `update bookings set status = 'live', proof_status = 'accepted', proof_accepted_at = now() where id in ('${ran.join("','")}')`)
  }, 60_000)

  it('makes a report from bookings whose ads went up', async () => {
    const eligible = (await api('get', '/reports/bookings')).body.data.map((booking: { id: string }) => booking.id)

    expect(eligible.sort()).toEqual([...ran].sort())
    expect((await api('post', '/reports', { title: 'Q4 launch', bookingIds: [...ran, held] })).status).toBe(422)
    expect((await api('post', '/reports', { title: 'Q4 launch', bookingIds: ran }, 'outsider')).status).toBe(422)

    const made = await api('post', '/reports', { title: 'Q4 launch', bookingIds: ran })

    expect(made.status).toBe(201)
    expect(made.body.data).toMatchObject({ title: 'Q4 launch', advertiser: 'Reporting advertiser', summary: { boards: 1, photos: 0, spendMinor: expect.any(Number) } })
    expect(made.body.data.runs).toHaveLength(2)
    expect(made.body.data.runs[0]).toMatchObject({ bookingId: ran[0], board: { name: 'Reported board' } })

    reportId = made.body.data.id
    link = made.body.data.link

    expect((await api('get', '/reports')).body.data).toEqual([expect.objectContaining({ id: reportId, bookings: 2, link })])
    expect((await api('get', `/reports/${reportId}`, undefined, 'outsider')).status).toBe(404)
  })

  it('shares it by link, keeping spend private by default', async () => {
    const token = link.split('/').at(-1)!
    const shared = await api('get', `/reports/shared/${token}`, undefined, null)

    expect(shared.status).toBe(200)
    expect(shared.body.data).toMatchObject({ title: 'Q4 launch', link: null, summary: { spendMinor: null } })
    expect(shared.body.data.summary.days).toBeGreaterThanOrEqual(56)
    expect(shared.body.data.runs[1].amountMinor).toBeNull()
    expect((await api('get', `/reports/shared/${token}`)).body.data.summary.spendMinor).toBeGreaterThan(0)
  })

  it('stops an old link working once there is a new one, or the report is deleted', async () => {
    const old = link.split('/').at(-1)!
    const fresh = (await api('post', `/reports/${reportId}/link`)).body.data.link.split('/').at(-1)

    expect((await api('get', `/reports/shared/${old}`, undefined, null)).status).toBe(404)
    expect((await api('get', `/reports/shared/${fresh}`, undefined, null)).status).toBe(200)

    await api('delete', `/reports/${reportId}`)

    expect((await api('get', `/reports/shared/${fresh}`, undefined, null)).status).toBe(404)
  })
})
