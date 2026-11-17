import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import { lastCode } from './support/sms'
import { execFileSync } from 'node:child_process'
import request from 'parasito'
import { passChecks } from './support/partner'

const tokens: Record<string, string> = {}

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: Record<string, unknown>, as: string | null = 'scout') => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

const board = (name: string, owner: Record<string, unknown>, as = 'scout') =>
  api('post', '/account/boards', { name, kind: 'billboard', widthM: 12, heightM: 4, latitude: 6.45, longitude: 3.4, as, ...owner }, as === 'owner' ? 'agency' : 'scout')

describe('Owner profiles', () => {
  const stamp = String(Date.now()).slice(-7)
  const phone = `+234809${stamp}`
  const name = `Chief Okonkwo ${stamp}`

  beforeAll(async () => {
    for (const who of ['scout', 'reviewer', 'agency', 'claimer']) {
      const email = `owners-${who}-${Date.now()}@greyboards.test`
      const roles = who === 'scout' ? ['scout'] : who === 'agency' ? ['owner'] : ['advertiser']
      const register = await api('post', '/auth/register', { name: `Owners ${who}`, email, password: 'password123', roles }, null)

      tokens[who] = register.body.data.token

      if (who === 'reviewer') execFileSync('npx', ['ark', 'users:role', email, 'reviewer'], { cwd: process.cwd(), encoding: 'utf8' })
    }

    const scoutRole = (await api('get', '/account/roles')).body.data[0]

    await passChecks(tokens.scout)
    await api('put', `/admin/account-roles/${scoutRole.id}`, { status: 'active' }, 'reviewer')
  }, 60_000)

  it('makes a profile the first time an owner is tagged, and reuses it for the same number', async () => {
    const first = await board('Ikeja along', { ownerName: name, ownerPhone: `0809 ${stamp}` })
    const second = await board('Ikeja along, other side', { ownerName: 'Someone else', ownerPhone: phone })

    expect(first.status).toBe(201)
    expect(first.body.data.owner).toMatchObject({ name, phone, claimed: false })
    expect(second.body.data.owner.id).toBe(first.body.data.owner.id)
  })

  it('suggests owners while typing, with their numbers hidden', async () => {
    const found = await api('get', `/owner-profiles?search=${encodeURIComponent(`okonkwo ${stamp}`)}`)
    const byPhone = await api('get', `/owner-profiles?search=${stamp}`)

    expect(found.body.data).toEqual([expect.objectContaining({ name, claimed: false, boards: 2 })])
    expect(found.body.data[0].phone).not.toContain(stamp.slice(0, 3))
    expect(byPhone.body.data.map((owner: { name: string }) => owner.name)).toContain(name)
    expect((await api('get', '/owner-profiles?search=ok', undefined, 'claimer')).status).toBe(403)

    const picked = await board('Picked from suggestions', { ownerProfileId: found.body.data[0].id })

    expect(picked.body.data.owner.name).toBe(name)
  })

  it('lets the owner claim the profile by proving the number, and then manage its boards', async () => {
    expect((await api('post', '/account/owner-profiles/claim', { phone: '+2340000000001' }, 'claimer')).status).toBe(404)
    expect((await api('post', '/account/owner-profiles/claim', { phone }, 'claimer')).status).toBe(200)
    expect((await api('post', '/account/owner-profiles/claim/verify', { phone, code: '000000' === lastCode(phone) ? '111111' : '000000' }, 'claimer')).status).toBe(422)

    const claimed = await api('post', '/account/owner-profiles/claim/verify', { phone, code: lastCode(phone) }, 'claimer')

    expect(claimed.status).toBe(200)
    expect(claimed.body.data).toMatchObject({ name, claimed: true })

    const mine = await api('get', '/account/boards', undefined, 'claimer')
    const roles = await api('get', '/account/roles', undefined, 'claimer')

    expect(mine.body.data.map((item: { name: string }) => item.name)).toEqual(expect.arrayContaining(['Ikeja along', 'Picked from suggestions']))
    expect(roles.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'owner', status: 'active' })]))
    expect((await api('post', '/account/owner-profiles/claim', { phone }, 'agency')).status).toBe(404)
  })

  it('lets one account manage several owners and tag boards under each', async () => {
    const own = await board('Agency’s own wall', {}, 'owner')
    const client = await api('post', '/account/owner-profiles', { name: 'Client Ltd' }, 'agency')
    const forClient = await board('Client’s gantry', { ownerProfileId: client.body.data.id }, 'owner')
    const profiles = await api('get', '/account/owner-profiles', undefined, 'agency')

    expect(own.body.data.owner).toMatchObject({ name: 'Owners agency', claimed: true })
    expect(forClient.body.data.owner).toMatchObject({ name: 'Client Ltd', claimed: true })
    expect(profiles.body.data.map((profile: { name: string }) => profile.name)).toEqual(['Owners agency', 'Client Ltd'])
    expect((await board('Not mine', { ownerProfileId: client.body.data.id }, 'scout')).body.data.owner.name).toBe('Client Ltd')
    expect((await api('put', `/account/owner-profiles/${client.body.data.id}`, { name: 'Taken over' }, 'scout')).status).toBe(404)
  })
})
