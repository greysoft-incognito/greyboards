import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'
import { Csv } from '../src/app/support/Csv'

const tokens: Record<string, string> = {}

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: Record<string, unknown>, as: string | null = 'owner') => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

describe('Owner bulk tools', () => {
  const lat = 7 + Math.random() * 2
  const lng = 8 + Math.random() * 2
  const csv = [
    'Name,Type,Width (m),Height (m),Latitude,Longitude,Rate,Period,Faces,Lit,City',
    `"Kano Road, by the bridge",Billboard,12,4,${lat},${lng},"850,000",monthly,2,yes,Kaduna`,
    `Barnawa wall,wall,6,3,${lat + 0.01},${lng},120000,week,,no,Kaduna`,
    `Bad row,spaceship,0,4,${lat},200,abc,daily,9,,`,
  ].join('\r\n')
  let imported: string[] = []

  beforeAll(async () => {
    for (const who of ['owner', 'advertiser']) {
      const register = await api('post', '/auth/register', { name: `Bulk ${who}`, email: `bulk-${who}-${Date.now()}@greyboards.test`, password: 'password123', roles: [who] }, null)

      tokens[who] = register.body.data.token
    }
  }, 60_000)

  it('reads CSV the way spreadsheets save it', () => {
    expect(Csv.parse('﻿a,b\r\n"x, ""y""",2\n\n')).toEqual([['a', 'b'], ['x, "y"', '2']])
    expect(Csv.parse('a;b\n1;"2;3"')).toEqual([['a', 'b'], ['1', '2;3']])
  })

  it('previews every row, saying what to fix, without saving', async () => {
    const preview = await api('post', '/account/boards/import', { csv, dryRun: true })

    expect(preview.status).toBe(200)
    expect(preview.body.data).toMatchObject({ dryRun: true, total: 3, ok: 2, failed: 1, imported: 0 })
    expect(preview.body.data.rows[2]).toMatchObject({ line: 4, ok: false })
    expect(preview.body.data.rows[2].errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Kind must be'), expect.stringContaining('Width'), expect.stringContaining('Longitude'), expect.stringContaining('Rate'), expect.stringContaining('Period')]),
    )
    expect((await api('get', '/account/boards')).body.data).toHaveLength(0)
    expect((await api('post', '/account/boards/import', { csv: 'name,kind\nA,wall' })).status).toBe(422)
    expect((await api('post', '/account/boards/import', { csv }, 'advertiser')).status).toBe(403)
  })

  it('imports the rows that pass as boards waiting for review', async () => {
    const done = await api('post', '/account/boards/import', { csv })

    expect(done.status).toBe(201)
    expect(done.body.data).toMatchObject({ imported: 2, failed: 1 })

    imported = done.body.data.rows.filter((row: { boardId?: string }) => row.boardId).map((row: { boardId: string }) => row.boardId)

    const board = (await api('get', `/boards/${imported[0]}`)).body.data

    expect(board).toMatchObject({ name: 'Kano Road, by the bridge', kind: 'billboard', faces: 2, lit: true, status: 'pending', rate: { amountMinor: 85_000_000, period: 'month' } })
    expect((await api('get', `/boards/${imported[1]}`)).body.data).toMatchObject({ kind: 'wall', faces: 1, lit: false, rate: { amountMinor: 12_000_000, period: 'week' } })
  })

  it('changes many rates at once, with a preview first', async () => {
    const face = (await api('get', `/boards/${imported[0]}`)).body.data.rateCard[1]

    await api('put', `/account/boards/${imported[0]}/faces/${face.id}`, { rateMinor: 70_000_000 })

    const preview = await api('post', '/account/boards/price-rule', { boardIds: imported, change: 'percent', value: 10, dryRun: true })

    expect(preview.body.data.rows).toEqual([
      expect.objectContaining({ boardId: imported[0], beforeMinor: 85_000_000, afterMinor: 93_500_000, faces: [expect.objectContaining({ beforeMinor: 70_000_000, afterMinor: 77_000_000 })] }),
      expect.objectContaining({ boardId: imported[1], beforeMinor: 12_000_000, afterMinor: 13_200_000 }),
    ])
    expect((await api('get', `/boards/${imported[1]}`)).body.data.rate.amountMinor).toBe(12_000_000)

    const applied = await api('post', '/account/boards/price-rule', { boardIds: imported, change: 'amount', value: -2_000_000 })

    expect(applied.body.data.changed).toBe(2)
    expect((await api('get', `/boards/${imported[0]}`)).body.data.rateCard.map((entry: { rateMinor: number }) => entry.rateMinor)).toEqual([83_000_000, 68_000_000])
    expect((await api('get', `/boards/${imported[1]}`)).body.data.rate.amountMinor).toBe(10_000_000)
    expect((await api('post', '/account/boards/price-rule', { boardIds: imported, change: 'set', value: 50_000_000 }, 'advertiser')).status).toBe(403)
  })

  it('keeps the owner’s fixed amount when a rule changes it', async () => {
    await api('put', `/account/boards/${imported[1]}`, { ownerNet: true })
    await api('post', '/account/boards/price-rule', { boardIds: [imported[1]], change: 'set', value: 16_000_000 })

    // With no scout the owner gets 80%, so ₦160,000 for the owner lists at ₦200,000.
    expect((await api('get', `/boards/${imported[1]}`)).body.data).toMatchObject({ ownerRateMinor: 16_000_000, rate: { amountMinor: 20_000_000 } })
  })
})
