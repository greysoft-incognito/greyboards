import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'
import { passChecks } from './support/partner'
import { ark } from './support/ark'

const tokens: Record<string, string> = {}

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: Record<string, unknown>, as: string | null = 'member') => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

describe('Marketplace roles', () => {
  beforeAll(async () => {
    for (const who of ['member', 'reviewer']) {
      const email = `roles-${who}-${Date.now()}@greyboards.test`
      const register = await api('post', '/auth/register', { name: `Roles ${who}`, email, password: 'password123', roles: ['owner', 'scout'] }, null)

      tokens[who] = register.body.data.token

      if (who === 'reviewer') ark('users:role', email, 'reviewer')
    }
  }, 60_000)

  it('describes every role to visitors', async () => {
    const definitions = (await api('get', '/account-roles', undefined, null)).body.data

    expect(definitions.map((definition: { kind: string }) => definition.kind)).toEqual(['advertiser', 'owner', 'scout', 'dispatch'])
  })

  it('starts owners at once and sends scouts for review', async () => {
    const roles = (await api('get', '/account/roles')).body.data

    expect(roles).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'owner', status: 'active' }), expect.objectContaining({ kind: 'scout', status: 'pending' })]),
    )
    expect(roles).toHaveLength(2)
  })

  it('takes on another role once, and refuses roles that do not exist', async () => {
    const first = await api('post', '/account/roles', { kind: 'advertiser' })
    const again = await api('post', '/account/roles', { kind: 'advertiser' })

    expect(first.body.data).toMatchObject({ kind: 'advertiser', status: 'active' })
    expect(again.body.data.id).toBe(first.body.data.id)
    expect((await api('post', '/account/roles', { kind: 'printer' })).status).toBe(422)
  })

  it('lets reviewers approve, reject and suspend applications', async () => {
    // The queue is oldest first, so a new application is on its last page.
    const first = await api('get', '/admin/account-roles?kind=scout&status=pending&per_page=100', undefined, 'reviewer')
    const pending = await api('get', `/admin/account-roles?kind=scout&status=pending&per_page=100&page=${first.body.meta.last_page}`, undefined, 'reviewer')
    const mine = (await api('get', '/account/roles')).body.data.find((role: { kind: string }) => role.kind === 'scout')

    expect(pending.body.data.map((role: { id: string }) => role.id)).toContain(mine.id)
    expect((await api('get', '/admin/account-roles')).status).toBe(403)

    const rejected = await api('put', `/admin/account-roles/${mine.id}`, { status: 'rejected', note: 'Add a clear ID photo' }, 'reviewer')

    expect(rejected.body.data).toMatchObject({ status: 'rejected', note: 'Add a clear ID photo' })
    expect((await api('post', '/account/roles', { kind: 'scout' })).body.data).toMatchObject({ status: 'pending', note: null })

    await passChecks(tokens.member)
    await api('put', `/admin/account-roles/${mine.id}`, { status: 'active' }, 'reviewer')

    expect((await api('get', '/auth/me')).body.data.accountRoles).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'scout', status: 'active' })]))

    await api('put', `/admin/account-roles/${mine.id}`, { status: 'suspended' }, 'reviewer')

    expect((await api('delete', '/account/roles/scout')).status).toBe(422)
    expect((await api('put', `/admin/account-roles/${mine.id}`, { status: 'pending' }, 'reviewer')).status).toBe(422)
  })

  it("doesn't let reviewers review themselves", async () => {
    const own = (await api('get', '/account/roles', undefined, 'reviewer')).body.data.find((role: { kind: string }) => role.kind === 'scout')

    expect((await api('put', `/admin/account-roles/${own.id}`, { status: 'active' }, 'reviewer')).status).toBe(422)
  })

  it('gives up a role', async () => {
    expect((await api('delete', '/account/roles/owner')).status).toBe(200)
    expect((await api('delete', '/account/roles/owner')).status).toBe(404)
  })
})
