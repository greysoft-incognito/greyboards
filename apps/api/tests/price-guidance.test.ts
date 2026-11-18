import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../src/core/bootstrap'
import request from 'parasito'
import { ark } from './support/ark'

const tokens: Record<string, string> = {}

const api = (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: Record<string, unknown>, as: string | null = 'owner') => {
  const call = request(app)[method](`/api${path}`).set({ Accept: 'application/json' })

  if (as && tokens[as]) call.set('Authorization', `Bearer ${tokens[as]}`)

  return body ? call.send(body) : call
}

describe('Traffic estimates and price guidance', () => {
  // A random spot far from other tests' boards, so only these are compared.
  const latitude = 11.5 + Math.random() * 2
  const longitude = 3.5 + Math.random() * 2
  const guide = (query: string) => api('get', `/account/boards/price-guide?lat=${latitude}&lng=${longitude}&${query}`)

  beforeAll(async () => {
    for (const who of ['owner', 'reviewer']) {
      const email = `guide-${who}-${Date.now()}@greyboards.test`
      const register = await api('post', '/auth/register', { name: `Guide ${who}`, email, password: 'password123', roles: ['owner'] }, null)

      tokens[who] = register.body.data.token

      if (who === 'reviewer') ark('users:role', email, 'reviewer')
    }

    // ₦1,000,000, ₦1,200,000 and ₦1,500,000 a month for 48 m²: about ₦20,833, ₦25,000 and ₦31,250 a square metre.
    for (const [index, rate] of [100_000_000, 120_000_000, 150_000_000].entries()) {
      const board = { name: `Guide board ${index}`, kind: 'billboard', widthM: 12, heightM: 4, latitude: latitude + index * 0.002, longitude, rateMinor: rate, ratePeriod: 'month', as: 'owner' }
      const id = (await api('post', '/account/boards', board)).body.data.id

      await api('put', `/admin/boards/${id}`, { status: 'listed' }, 'reviewer')
    }
  }, 60_000)

  it('guides a price from boards of the same kind nearby, by the square metre', async () => {
    const monthly = await guide('kind=billboard&widthM=6&heightM=4&period=month')

    expect(monthly.status).toBe(200)
    expect(monthly.body.data).toMatchObject({
      basis: 'comparables',
      suggestedMinor: 60_000_000,
      comparables: { count: 3, lowMinor: 50_000_000, medianMinor: 60_000_000, highMinor: 75_000_000 },
    })

    // A week is 7 of the average month's 30.4 days.
    expect((await guide('kind=billboard&widthM=6&heightM=4&period=week')).body.data.suggestedMinor).toBe(13_800_000)
  })

  it('falls back to what the traffic is worth when there aren’t enough boards to compare', async () => {
    const road = await guide('kind=wall&widthM=6&heightM=4&roadClass=major')

    // 30,000 people a day for a month, at ₦400 for 1,000 views.
    expect(road.body.data).toMatchObject({ basis: 'traffic', traffic: { daily: 30_000, source: 'road' }, suggestedMinor: 36_500_000, comparables: null })

    const counted = await guide('kind=wall&widthM=6&heightM=4&roadClass=major&dailyTraffic=10000')

    expect(counted.body.data).toMatchObject({ traffic: { daily: 10_000, source: 'measured' }, suggestedMinor: 12_200_000 })
    expect((await guide('kind=wall&widthM=6&heightM=4')).body.data).toMatchObject({ basis: null, suggestedMinor: null, traffic: null })
  })

  it('shows what a board reaches and costs for each 1,000 people passing', async () => {
    const tagged = await api('post', '/account/boards', {
      name: 'Busy street wall',
      kind: 'wall',
      widthM: 6,
      heightM: 3,
      latitude: latitude + 0.01,
      longitude,
      rateMinor: 36_500_000,
      ratePeriod: 'month',
      roadClass: 'street',
      as: 'owner',
    })

    expect(tagged.body.data).toMatchObject({ roadClass: 'street', traffic: { daily: 12_000, source: 'road' }, costPerThousandMinor: 100_000, measuredTraffic: null })

    const counted = await api('put', `/account/boards/${tagged.body.data.id}`, { dailyTraffic: 24_000 })

    expect(counted.body.data).toMatchObject({ traffic: { daily: 24_000, source: 'measured' }, costPerThousandMinor: 50_000, measuredTraffic: 24_000 })
  })
})
