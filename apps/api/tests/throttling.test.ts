import { describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'
import { totp, wrongCode } from './support/totp'

const api = (method: 'get' | 'post', path: string, body?: Record<string, unknown>, headers: Record<string, string> = {}) => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json', ...headers })

  return body ? call.send(body) : call
}

const register = async (prefix: string) => {
  const email = `${prefix}-${Date.now()}@greyboards.test`
  const res = await api('post', '/auth/register', { name: 'Throttle Tester', email, password: 'password123' })

  return { email, token: res.body.data.token as string }
}

describe('Throttling', () => {
  it('locks an email out after five wrong passwords, even for the right one', async () => {
    const { email } = await register('lockout')
    const other = await register('lockout-other')

    for (let i = 0; i < 5; i++) await api('post', '/auth/login', { email, password: 'wrong-password' }).expect(422)

    const locked = await api('post', '/auth/login', { email, password: 'password123' })

    expect(locked.status).toBe(429)
    expect(locked.body.message).toMatch(/^Too many sign-in attempts\. Try again in 15 minutes\.$/)

    await api('post', '/auth/login', { email: other.email, password: 'password123' }).expect(200)
  })

  it('clears the count after a successful sign-in', async () => {
    const { email } = await register('clears')

    for (let i = 0; i < 4; i++) await api('post', '/auth/login', { email, password: 'wrong-password' }).expect(422)

    await api('post', '/auth/login', { email, password: 'password123' }).expect(200)

    for (let i = 0; i < 4; i++) await api('post', '/auth/login', { email, password: 'wrong-password' }).expect(422)

    await api('post', '/auth/login', { email, password: 'password123' }).expect(200)
  })

  it('locks two-step sign-in after five wrong codes', async () => {
    const { email, token } = await register('two-step')
    const auth = { Authorization: `Bearer ${token}` }
    const setup = await api('post', '/account/two-factor/setup', undefined, auth)

    await api('post', '/account/two-factor', { code: totp(setup.body.data.secret) }, auth).expect(200)

    const login = await api('post', '/auth/login', { email, password: 'password123' })
    const challengeToken = login.body.data.challengeToken

    for (let i = 0; i < 5; i++) await api('post', '/auth/two-factor', { challengeToken, code: wrongCode(setup.body.data.secret) }).expect(422)

    const locked = await api('post', '/auth/two-factor', { challengeToken, code: totp(setup.body.data.secret) })

    expect(locked.status).toBe(429)
    expect(locked.body.message).toContain('Too many wrong codes.')
  })

})
