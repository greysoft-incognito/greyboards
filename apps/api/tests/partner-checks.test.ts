import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import { addBank, sendId } from './support/partner'
import request from 'parasito'
import { ark } from './support/ark'

const tokens: Record<string, string> = {}

const api = (method: 'get' | 'post' | 'put', path: string, body?: Record<string, unknown>, as: string | null = 'applicant') => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

describe('Partner checks and duplicate boards', { timeout: 30_000 }, () => {
  let roleId = ''

  beforeAll(async () => {
    for (const who of ['applicant', 'owner', 'admin']) {
      const email = `checks-${who}-${Date.now()}@greyboards.test`
      const register = await api('post', '/auth/register', { name: `Checks ${who}`, email, password: 'password123', roles: [who === 'applicant' ? 'scout' : 'owner'] }, null)

      tokens[who] = register.body.data.token

      if (who === 'admin') ark('users:role', email, 'admin')
    }

    roleId = (await api('get', '/account/roles')).body.data.find((role: { kind: string }) => role.kind === 'scout').id
  }, 60_000)

  it('lets nobody in as a scout without an ID and a bank account', async () => {
    const approve = await api('put', `/admin/account-roles/${roleId}`, { status: 'active' }, 'admin')

    expect(approve.status).toBe(422)
    expect(approve.body.message).toMatch(/ID.*bank account/)

    const checks = await api('get', '/account/partner-checks')

    expect(checks.body.data).toMatchObject({ identity: null, bank: null, namesMatch: null, required: ['identity', 'bank'], missing: ['identity', 'bank'] })
    expect((await api('get', '/account/roles')).body.data.find((role: { id: string }) => role.id === roleId).missing).toEqual(['identity', 'bank'])
    expect(checks.body.documents.map((document: { type: string }) => document.type)).toContain('nin')
  })

  it('shows reviewers the ID and whether the bank name matches it', async () => {
    const sent = await sendId(tokens.applicant, 'Ada Obi')

    expect(sent.status).toBe(201)
    expect(sent.body.data.identity).toMatchObject({ status: 'submitted', fullName: 'Ada Obi', documentNumber: '•••••••8901', photoUrl: null })

    await addBank(tokens.applicant)

    const listed = (await api('get', '/admin/account-roles?kind=scout&status=pending&perPage=100', undefined, 'admin')).body.data.find((role: { id: string }) => role.id === roleId)

    expect(listed.checks).toMatchObject({ identity: { documentNumber: '12345678901' }, bank: { accountName: 'Test Account Holder' }, namesMatch: false, missing: [] })
    expect(listed.missing).toEqual([])
    expect(listed.checks.identity.photoUrl).toBeTruthy()

    await api('put', `/admin/account-roles/${roleId}/identity`, { status: 'rejected', note: 'Too blurry to read' }, 'admin')

    expect((await api('put', `/admin/account-roles/${roleId}`, { status: 'active' }, 'admin')).status).toBe(422)
    expect((await api('get', '/account/partner-checks')).body.data).toMatchObject({ identity: { status: 'rejected', note: 'Too blurry to read' }, missing: ['identity'] })
  })

  it('approves once a clear ID is in, and marks the ID checked', async () => {
    await sendId(tokens.applicant)

    expect((await api('get', '/account/partner-checks')).body.data.namesMatch).toBe(true)
    expect((await api('put', `/admin/account-roles/${roleId}`, { status: 'active' }, 'admin')).status).toBe(200)
    expect((await api('get', '/account/partner-checks')).body.data.identity.status).toBe('verified')
  })

  it('warns before tagging a board someone already tagged, and flags it for reviewers', async () => {
    const latitude = 6.5 + Math.random() / 100
    const longitude = 3.35
    const board = { name: 'Roundabout board', kind: 'billboard', widthM: 12, heightM: 4, latitude, longitude, headingDeg: 90, as: 'owner' }
    const first = (await api('post', '/account/boards', board, 'owner')).body.data

    const near = (heading: number) => api('get', `/account/boards/nearby?lat=${latitude + 0.0001}&lng=${longitude}&headingDeg=${heading}`, undefined, 'owner')

    expect((await near(100)).body.data).toEqual([expect.objectContaining({ id: first.id, name: 'Roundabout board', status: 'pending' })])
    expect((await near(270)).body.data).toEqual([])

    const second = (await api('post', '/account/boards', { ...board, headingDeg: 80 }, 'owner')).body.data
    const reviewed = (await api('get', `/admin/boards/${second.id}`, undefined, 'admin')).body.data

    expect(reviewed.duplicateOf).toMatchObject({ id: first.id, name: 'Roundabout board' })
  })
})
