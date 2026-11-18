import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'
import { ark } from './support/ark'

const tokens: Record<string, string> = {}

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: Record<string, unknown>, as: string | null = 'scoutA') => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

describe('Scout pipeline and territories', { timeout: 60_000 }, () => {
  const stamp = Date.now()
  const here = { latitude: 10.3 + Math.random() / 50, longitude: 6.6 }
  const there = { latitude: here.latitude + 0.05, longitude: 6.7 }
  const phone = `+23481${String(stamp).slice(-8)}`
  const emails: Record<string, string> = {}
  let prospectId = ''

  beforeAll(async () => {
    for (const who of ['scoutA', 'scoutB', 'advertiser', 'admin']) {
      emails[who] = `pipeline-${who.toLowerCase()}-${stamp}@greyboards.test`

      const roles = who.startsWith('scout') ? ['scout'] : ['advertiser']
      const register = await api('post', '/auth/register', { name: `Pipeline ${who}`, email: emails[who], password: 'password123', roles }, null)

      tokens[who] = register.body.data.token

      if (who === 'admin') ark('users:role', emails[who]!, 'admin')
    }

    ark('db', `update account_roles set status = 'active' where kind = 'scout' and user_id in (select id from users where email in ('${emails.scoutA}', '${emails.scoutB}'))`)
  }, 60_000)

  afterAll(async () => {
    await api('put', '/admin/settings/scouting', { enforce_territories: null }, 'admin')
  })

  it('keeps two scouts off the same board and the same owner', async () => {
    expect((await api('post', '/account/prospects', { name: 'Roundabout unipole', ...here }, 'advertiser')).status).toBe(403)

    const added = await api('post', '/account/prospects', { name: 'Roundabout unipole', ...here, ownerName: 'Mrs Bello', ownerPhone: `0${phone.slice(4)}`, notes: 'Shop next door knows her.' })

    expect(added.status).toBe(201)
    expect(added.body.data).toMatchObject({ stage: 'prospect', ownerPhone: phone, boardId: null })

    prospectId = added.body.data.id

    expect((await api('post', '/account/prospects', { name: 'Same board', ...here }, 'scoutB')).body.message).toMatch(/already working on a board here/)
    expect((await api('post', '/account/prospects', { name: 'Same owner', ...there, ownerPhone: phone }, 'scoutB')).body.message).toMatch(/already talking to this owner/)
    expect((await api('post', '/account/prospects', { name: 'Market wall', ...there }, 'scoutB')).status).toBe(201)
  })

  it('moves a prospect by hand, then follows its board once tagged', async () => {
    expect((await api('put', `/account/prospects/${prospectId}`, { stage: 'verified' })).status).toBe(422)
    expect((await api('put', `/account/prospects/${prospectId}`, { stage: 'contacted' })).body.data.stage).toBe('contacted')

    const board = { name: 'Roundabout unipole', kind: 'unipole', widthM: 12, heightM: 4, ...here, rateMinor: 30_000_000, ownerName: 'Mrs Bello', ownerPhone: phone, as: 'scout' }
    const boardId = (await api('post', '/account/boards', board)).body.data.id
    const captured = (await api('get', '/account/prospects')).body

    expect(captured.data[0]).toMatchObject({ id: prospectId, stage: 'captured', boardId })
    expect(captured.counts).toMatchObject({ captured: 1, prospect: 0 })

    await api('put', `/admin/boards/${boardId}`, { status: 'listed' }, 'admin')

    expect((await api('get', '/account/prospects?stage=verified')).body.data).toEqual([expect.objectContaining({ id: prospectId, stage: 'verified' })])
    expect((await api('put', `/account/prospects/${prospectId}`, { stage: 'signed' })).status).toBe(422)
    expect((await api('post', `/account/boards/${boardId}/agreement`)).status).toBe(201)
  })

  it('keeps scouts to their territories when that is turned on', async () => {
    const far = { latitude: here.latitude + 0.2, longitude: 6.9 }
    const territory = await api('post', '/admin/territories', { name: 'North market', ...far, radiusM: 2000, scoutEmail: emails.scoutB }, 'admin')

    expect(territory.status).toBe(201)
    expect(territory.body.data.scout).toMatchObject({ name: 'Pipeline scoutB' })
    expect((await api('post', '/admin/territories', { name: 'Nobody', ...far, radiusM: 2000, scoutEmail: emails.advertiser }, 'admin')).status).toBe(422)
    expect((await api('get', '/account/territories', undefined, 'scoutB')).body.data).toEqual([expect.objectContaining({ name: 'North market' })])

    const spot = { name: 'Inside the market', latitude: far.latitude + 0.001, longitude: far.longitude }

    await api('put', '/admin/settings/scouting', { enforce_territories: true }, 'admin')

    expect((await api('post', '/account/prospects', spot)).body.message).toMatch(/another scout’s territory/)
    expect((await api('post', '/account/prospects', spot, 'scoutB')).status).toBe(201)
  })

  it('lists what needs doing', async () => {
    ark('db', `update prospects set "updatedAt" = now() - interval '30 days' where scout_id = (select id from users where email = '${emails.scoutB}')`)

    const mine = (await api('get', '/account/tasks')).body.data
    const theirs = (await api('get', '/account/tasks', undefined, 'scoutB')).body.data

    expect(mine).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'agreement', title: 'Mrs Bello hasn’t signed for Roundabout unipole' })]))
    expect(theirs).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'follow_up', title: 'Follow up on Market wall' })]))
  })
})
