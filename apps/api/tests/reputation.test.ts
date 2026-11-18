import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'
import { passChecks, pixel } from './support/partner'
import { ark } from './support/ark'
import { takeJob } from './support/dispatch'
import { lastCode, lastText } from './support/sms'

const tokens: Record<string, string> = {}

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

/** The account's role of `kind`, with its reputation. */
const roleOf = async (who: string, kind: string) => ((await api('get', '/account/roles', undefined, who)).body.data as any[]).find((role) => role.kind === kind)

describe('Reputation and badges', () => {
  const latitude = 9.4 + Math.random() / 100
  const longitude = 8.1
  const at = (metres: number) => ({ latitude: latitude + metres / 111_320, longitude, accuracyM: 8 })
  let bookingId = ''
  let boardId = ''

  beforeAll(async () => {
    for (const who of ['advertiser', 'owner', 'reviewer', 'poster', 'admin']) {
      const email = `reputation-${who}-${Date.now()}@greyboards.test`
      const roles = who === 'owner' ? ['owner'] : who === 'poster' ? ['dispatch'] : ['advertiser']
      const register = await api('post', '/auth/register', { name: `Reputation ${who}`, email, password: 'password123', roles }, null)

      tokens[who] = register.body.data.token

      if (who === 'reviewer') ark('users:role', email, 'reviewer')
      if (who === 'admin') ark('users:role', email, 'admin')
    }

    await api('put', '/admin/settings/reputation', { proven_score: 10, proven_actions: 1, proven_days: 0, revoke_proven: true }, 'admin')
    await passChecks(tokens.poster)
    await api('put', `/admin/account-roles/${(await roleOf('poster', 'dispatch')).id}`, { status: 'active' }, 'reviewer')

    const board = (await api('post', '/account/boards', { name: 'Reputation board', kind: 'billboard', widthM: 10, heightM: 5, latitude, longitude, rateMinor: 50_000_000, as: 'owner' }, 'owner')).body.data

    boardId = board.id
    await api('put', `/admin/boards/${board.id}`, { status: 'listed' }, 'reviewer')

    const held = (await api('post', `/boards/${board.id}/bookings`, { startsOn: '2027-10-01', periods: 1 })).body.data
    const payment = (await api('post', `/bookings/${held.id}/checkout`)).body.data

    await api('post', `/payments/${payment.reference}/verify`)
    await upload(`/bookings/${held.id}/artwork`, 'artwork', 'advertiser')

    const booking = (await api('post', `/bookings/${held.id}/artwork/review`, { decision: 'approve' }, 'owner')).body.data

    bookingId = booking.id
    await takeJob(api, booking.printJob.id, booking.id, 'poster')
    await upload(`/print-jobs/${booking.printJob.id}/print-photo`, 'photo', 'poster')
    await upload(`/bookings/${bookingId}/proofs`, 'photo', 'poster', at(10))
    await upload(`/bookings/${bookingId}/proofs`, 'photo', 'poster', at(12))
    await api('post', `/bookings/${bookingId}/proof/submit`, undefined, 'poster')
  }, 120_000)

  afterAll(async () => {
    await api('put', '/admin/settings/reputation', { proven_score: null, proven_actions: null, proven_days: null, revoke_proven: null }, 'admin')
  })

  it('explains both badges and what earns points to anyone, with the numbers in use', async () => {
    const disclosure = await api('get', '/reputation', undefined, null)

    expect(disclosure.status).toBe(200)
    expect(disclosure.body.data.badges.map((badge: any) => badge.key)).toEqual(['verified', 'proven'])
    expect(disclosure.body.data.badges[1].description).toContain('reaches 10 reputation points from at least 1 checked actions')
    expect(disclosure.body.data.rules).toContainEqual(expect.objectContaining({ action: 'missed', roles: ['dispatch'], points: -15 }))
  })

  it('starts every role at zero, with how far it is from the proven badge', async () => {
    expect((await roleOf('poster', 'dispatch')).reputation).toMatchObject({ score: 0, actions: 0, verified: false, proven: false, progress: { score: { have: 0, need: 10 } } })
  })

  it('credits whoever put the ad up, the owner and the advertiser once the proof is accepted, and proves the poster', async () => {
    expect((await api('post', `/bookings/${bookingId}/proof/accept`)).status).toBe(200)

    expect((await roleOf('poster', 'dispatch')).reputation).toMatchObject({ score: 10, actions: 1, proven: true, verified: false })
    expect((await roleOf('owner', 'owner')).reputation).toMatchObject({ score: 4, actions: 1, proven: false })
    expect((await roleOf('advertiser', 'advertiser')).reputation).toMatchObject({ score: 3, actions: 1 })

    const history = await api('get', '/account/roles/dispatch/reputation', undefined, 'poster')

    expect(history.body.data).toEqual([expect.objectContaining({ action: 'posted', points: 10, subjectId: bookingId })])
    expect((await api('get', '/account/roles/scout/reputation', undefined, 'poster')).status).toBe(404)
  })

  it('shows the board’s side standing on the board, without names', async () => {
    const board = (await api('get', `/boards/${boardId}`, undefined, 'advertiser')).body.data

    expect(board.stewards).toEqual([{ kind: 'owner', score: 4, verified: false, proven: false }])
    expect(board.owner).toBeUndefined()
  })

  it('lets staff verify a role by hand, separately from the proven badge', async () => {
    const role = await roleOf('poster', 'dispatch')

    expect((await api('put', `/admin/account-roles/${role.id}/verification`, { note: 'Met at the print shop' }, 'advertiser')).status).toBe(403)

    const verified = await api('put', `/admin/account-roles/${role.id}/verification`, { note: 'Met at the print shop' }, 'reviewer')

    expect(verified.status).toBe(200)
    expect(verified.body.data.reputation).toMatchObject({ verified: true, proven: true })

    const listed = (await api('get', '/admin/account-roles?badge=verified&perPage=100', undefined, 'reviewer')).body.data

    expect(listed.map((entry: any) => entry.id)).toContain(role.id)

    const ranked = ((await api('get', '/admin/account-roles?sort=reputation&perPage=50', undefined, 'reviewer')).body.data as any[]).map((entry) => entry.reputation.score)

    expect(ranked).toEqual([...ranked].sort((first, second) => second - first))

    const owner = await roleOf('owner', 'owner')
    const pending = await api('put', `/admin/account-roles/${owner.id}/verification`, {}, 'admin')

    expect(pending.status).toBe(200)
    expect((await api('delete', `/admin/account-roles/${owner.id}/verification`, undefined, 'admin')).body.data.reputation.verified).toBe(false)
  })

  it('lets staff correct a score with a reason, which takes the proven badge back below the milestone', async () => {
    const role = await roleOf('poster', 'dispatch')

    expect((await api('post', `/admin/account-roles/${role.id}/reputation`, { points: -6 }, 'reviewer')).status).toBe(422)

    const corrected = await api('post', `/admin/account-roles/${role.id}/reputation`, { points: -6, note: 'Left the site untidy' }, 'reviewer')

    expect(corrected.status).toBe(200)
    expect(corrected.body.data.reputation).toMatchObject({ score: 4, actions: 1, proven: false, verified: true })

    const history = (await api('get', `/admin/account-roles/${role.id}/reputation`, undefined, 'reviewer')).body.data

    expect(history[0]).toMatchObject({ action: 'adjusted', points: -6, note: 'Left the site untidy', label: 'Corrected by Greyboards staff' })
  })

  it('earns the badge back once the score reaches the milestone again', async () => {
    const role = await roleOf('poster', 'dispatch')

    await api('post', `/admin/account-roles/${role.id}/reputation`, { points: 6, note: 'Fixed it the same day' }, 'reviewer')

    expect((await roleOf('poster', 'dispatch')).reputation).toMatchObject({ score: 10, proven: true })
  })

  it('follows changed milestones on the schedule', async () => {
    await api('put', '/admin/settings/reputation', { proven_score: 20 }, 'admin')
    ark('reputation:sweep')
    expect((await roleOf('poster', 'dispatch')).reputation.proven).toBe(false)

    await api('put', '/admin/settings/reputation', { proven_score: 10 }, 'admin')
    ark('reputation:sweep')
    expect((await roleOf('poster', 'dispatch')).reputation.proven).toBe(true)
  })
})

describe('Reputation for scouts', () => {
  const phone = `+23481${String(Date.now()).slice(-8)}`

  beforeAll(async () => {
    for (const who of ['scout', 'reviewer']) {
      const email = `reputation-scout-${who}-${Date.now()}@greyboards.test`
      const register = await api('post', '/auth/register', { name: `Reputation ${who}`, email, password: 'password123', roles: ['scout'] }, null)

      tokens[`s-${who}`] = register.body.data.token

      if (who === 'reviewer') ark('users:role', email, 'reviewer')
    }

    await passChecks(tokens['s-scout']!)
    await api('put', `/admin/account-roles/${(await roleOf('s-scout', 'scout')).id}`, { status: 'active' }, 's-reviewer')
  }, 60_000)

  it('credits the scout once when the owner signs with the texted code', async () => {
    const board = (
      await api(
        'post',
        '/account/boards',
        { name: 'Reputation scout board', kind: 'unipole', widthM: 18, heightM: 6, latitude: 9.6, longitude: 8.3 + Math.random() / 100, rateMinor: 90_000_000, ownerName: 'Mrs Bello', ownerPhone: `0${phone.slice(4)}`, as: 'scout' },
        's-scout',
      )
    ).body.data

    await api('post', `/account/boards/${board.id}/agreement`, undefined, 's-scout')

    const token = lastText(phone).match(/\/agreements\/([\w-]+)/)?.[1] ?? ''

    await api('post', `/agreements/${token}/code`, undefined, null)
    expect((await api('post', `/agreements/${token}/sign`, { name: 'Amina Bello', code: lastCode(phone) }, null)).status).toBe(200)
    expect((await roleOf('s-scout', 'scout')).reputation).toMatchObject({ score: 8, actions: 1 })
  })
})
