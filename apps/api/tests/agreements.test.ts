import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import { Sms } from '../src/app/support/Sms'
import { lastCode, lastText } from './support/sms'
import { execFileSync } from 'node:child_process'
import request from 'parasito'

const tokens: Record<string, string> = {}

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: Record<string, unknown>, as: string | null = 'scout') => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

const linkToken = (phone: string) => lastText(phone).match(/\/agreements\/([\w-]+)/)?.[1] ?? ''

/** Lets the link go out again at once, as if the wait between texts had passed. */
const skipWait = (id: string) => {
  execFileSync('npx', ['ark', 'db', `update board_agreements set last_sent_at = now() - interval '2 minutes' where id = '${id}'`], { cwd: process.cwd(), encoding: 'utf8' })
}

describe('Owner agreements', () => {
  const phone = `+23480${String(Date.now()).slice(-8)}`
  let boardId = ''

  beforeAll(async () => {
    for (const who of ['scout', 'reviewer', 'owner']) {
      const email = `agreements-${who}-${Date.now()}@greyboards.test`
      const roles = who === 'owner' ? ['owner'] : ['scout']
      const register = await api('post', '/auth/register', { name: `Agreements ${who}`, email, password: 'password123', roles }, null)

      tokens[who] = register.body.data.token

      if (who === 'reviewer') execFileSync('npx', ['ark', 'users:role', email, 'reviewer'], { cwd: process.cwd(), encoding: 'utf8' })
    }

    const scoutRole = (await api('get', '/account/roles')).body.data[0]

    await api('put', `/admin/account-roles/${scoutRole.id}`, { status: 'active' }, 'reviewer')

    const local = `0${phone.slice(4)}`
    const board = await api('post', '/account/boards', {
      name: 'Third Mainland exit',
      kind: 'unipole',
      widthM: 18,
      heightM: 6,
      latitude: 6.5,
      longitude: 3.39,
      rateMinor: 100_000_000,
      ownerName: 'Mr Adeyemi',
      ownerPhone: local,
      as: 'scout',
    })

    boardId = board.body.data.id
  }, 60_000)

  it('texts the owner a link with the terms copied in', async () => {
    const sent = await api('post', `/account/boards/${boardId}/agreement`)

    expect(sent.status).toBe(201)
    expect(sent.body.data).toMatchObject({ status: 'sent', ownerSharePercent: 70, rate: { amountMinor: 100_000_000 }, sendCount: 1 })
    expect(lastText(phone)).toContain('Agreements scout wants to list your board "Third Mainland exit"')

    const board = await api('get', `/boards/${boardId}`)

    expect(board.body.data.agreement).toMatchObject({ id: sent.body.data.id, status: 'sent' })
  })

  it('waits before sending the link again, then sends a fresh one', async () => {
    const first = linkToken(phone)

    expect((await api('post', `/account/boards/${boardId}/agreement`)).status).toBe(429)

    skipWait((await api('get', `/boards/${boardId}`)).body.data.agreement.id)

    const again = await api('post', `/account/boards/${boardId}/agreement`)

    expect(again.body.data.sendCount).toBe(2)
    expect(linkToken(phone)).not.toBe(first)
    expect((await api('get', `/agreements/${first}`, undefined, null)).status).toBe(404)
  })

  it('shows the owner the board and terms without an account, with their number hidden', async () => {
    const offer = await api('get', `/agreements/${linkToken(phone)}`, undefined, null)

    expect(offer.status).toBe(200)
    expect(offer.body.data).toMatchObject({ status: 'sent', ownerSharePercent: 70, scout: { name: 'Agreements scout' }, board: { name: 'Third Mainland exit' } })
    expect(offer.body.data.ownerPhone).toMatch(/^\+234•+\d{4}$/)
    expect(JSON.stringify(offer.body.data)).not.toContain(phone)
  })

  it('signs with the texted code and puts the signed name on the board', async () => {
    const token = linkToken(phone)

    expect((await api('post', `/agreements/${token}/sign`, { name: 'Tunde Adeyemi', code: '123456' }, null)).status).toBe(422)
    expect((await api('post', `/agreements/${token}/code`, undefined, null)).status).toBe(200)

    const texted = lastCode(phone)

    expect(texted).toMatch(/^\d{6}$/)

    const wrong = texted === '000000' ? '111111' : '000000'

    expect((await api('post', `/agreements/${token}/sign`, { name: 'Tunde Adeyemi', code: wrong }, null)).status).toBe(422)

    const signed = await api('post', `/agreements/${token}/sign`, { name: 'Tunde Adeyemi', code: texted }, null)

    expect(signed.status).toBe(200)
    expect(signed.body.data).toMatchObject({ status: 'signed', signedName: 'Tunde Adeyemi' })
    expect((await api('get', `/boards/${boardId}`)).body.data).toMatchObject({ owner: { name: 'Tunde Adeyemi' }, agreement: { status: 'signed' } })
    expect((await api('post', `/agreements/${token}/decline`, undefined, null)).status).toBe(422)
    expect((await api('post', `/account/boards/${boardId}/agreement`)).status).toBe(422)
  })

  it('lets an owner decline, and has nothing to sign for boards owners tag themselves', async () => {
    const otherPhone = `+23481${String(Date.now()).slice(-8)}`
    const board = await api('post', '/account/boards', { name: 'Ikorodu Road', kind: 'billboard', widthM: 9, heightM: 3, latitude: 6.55, longitude: 3.37, ownerPhone: otherPhone, as: 'scout' })

    await api('post', `/account/boards/${board.body.data.id}/agreement`)

    const declined = await api('post', `/agreements/${linkToken(otherPhone)}/decline`, undefined, null)

    expect(declined.body.data.status).toBe('declined')

    const own = await api('post', '/account/boards', { name: 'My own board', kind: 'wall', widthM: 6, heightM: 3, latitude: 6.6, longitude: 3.35, as: 'owner' }, 'owner')

    expect((await api('post', `/account/boards/${own.body.data.id}/agreement`, undefined, 'owner')).status).toBe(422)
    expect((await api('post', `/account/boards/${own.body.data.id}/agreement`)).status).toBe(404)
  })

  it('writes local numbers in international form', () => {
    expect(Sms.normalize('0803 000 0000')).toBe('+2348030000000')
    expect(Sms.normalize('+234 (803) 000-0000')).toBe('+2348030000000')
    expect(Sms.mask('+2348030000000')).toBe('+234••••••0000')
  })
})
