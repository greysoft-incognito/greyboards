import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'

const pixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

describe('Uploads', () => {
  let token = ''

  const send = (path: string, files: Array<[string, Blob, string]>) => {
    const form = new FormData()

    for (const [field, blob, name] of files) form.append(field, blob, name)

    return request(app).post(`/api${path}`).set({ Accept: 'application/json', Authorization: `Bearer ${token}` }).send(form)
  }

  beforeAll(async () => {
    const register = await request(app)
      .post('/api/auth/register')
      .set({ Accept: 'application/json' })
      .send({ name: 'Upload Tester', email: `uploads-${Date.now()}@greyboards.test`, password: 'password123' })

    token = register.body.data.token
  })

  it('stores a profile photo and serves it from its signed URL', async () => {
    const res = await send('/account/avatar', [['avatar', new Blob([pixel], { type: 'image/jpeg' }), 'pixel.jpg']])
    const path = new URL(res.body.data.avatarUrl, 'http://localhost').pathname

    expect(res.status).toBe(200)
    expect(path).toMatch(/^\/avatars\/.+\.png$/)
    expect((await request(app).get(path)).status).toBe(200)
  })

  it('refuses files that only claim to be images', async () => {
    const page = new Blob(['<html><script>alert(1)</script></html>'], { type: 'image/png' })
    const avatar = await send('/account/avatar', [['avatar', page, 'page.png']])

    expect(avatar.status).toBe(422)
    expect(avatar.body.errors.avatar[0]).toContain('must be a JPEG, PNG')
  })

  it('refuses files over the largest upload setting before reading them in full', async () => {
    const res = await send('/account/avatar', [['avatar', new Blob([Buffer.alloc(26 * 1024 * 1024)], { type: 'image/png' }), 'big.png']])

    expect(res.status).toBe(413)
    expect(res.body.message).toBe('Files can be up to 25 MB.')
  })

  it('takes one file per request', async () => {
    const res = await send('/account/avatar', [
      ['avatar', new Blob([pixel], { type: 'image/png' }), 'one.png'],
      ['extra', new Blob([pixel], { type: 'image/png' }), 'two.png'],
    ])

    expect(res.status).toBe(413)
    expect(res.body.message).toBe('Send one file at a time.')
  })
})
