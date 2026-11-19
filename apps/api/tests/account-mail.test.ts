import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'
import { AccountMail } from '../src/app/notifications/AccountMail'
import { Notification } from '@arkstack/notifications'

/** A mail chain whose provider never answers, or fails at once. */
const provider = (send: () => Promise<unknown>) => {
  const chain = { prepare: () => chain, view: () => chain, subject: () => chain, send }

  vi.spyOn(Notification, 'mail').mockReturnValue(chain as never)
}

describe('account mail', () => {
  beforeAll(async () => {
    await request(app).get('/api')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('stops waiting on a provider that never answers', async () => {
    provider(() => new Promise(() => undefined))

    const started = Date.now()

    await AccountMail.passwordChanged({ name: 'Slow Inbox', email: 'slow@greyboards.test' } as never)

    expect(Date.now() - started).toBeLessThan(AccountMail.WAIT_MS + 1000)
  })

  it('still reports a delivery that fails straight away', async () => {
    provider(() => Promise.reject(new Error('Bad key')))

    await expect(AccountMail.passwordChanged({ name: 'Bad Key', email: 'bad@greyboards.test' } as never)).rejects.toThrow('Bad key')
  })
})
