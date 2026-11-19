import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import request from 'parasito'
import { app } from '../src/core/bootstrap'
import { Auction } from '@app/models/Auction'
import { Booking } from '@app/models/Booking'
import { BookingShare } from '@app/models/BookingShare'
import type { User } from '@app/models/User'
import { Shares } from '@app/services/Shares'
import { fakeQuery, useSettings } from './support/money'

const HOUR = 3_600_000

/** A held shared booking started `hoursAgo`, whose hold runs out `hoursLeft` from now. */
const shared = (hoursAgo: number, hoursLeft: number, amountMinor = 67_500_000) =>
  new Booking({
    id: 'booking-1',
    status: Booking.HELD,
    shared: true,
    amountMinor,
    createdAt: new Date(Date.now() - hoursAgo * HOUR),
    holdExpiresAt: new Date(Date.now() + hoursLeft * HOUR),
  } as never)

/** The booking's shares, as `exists` checks see the unpaid ones. */
const unpaidShares = (count: number) => vi.spyOn(BookingShare, 'query').mockReturnValue(fakeQuery(Array.from({ length: count }, () => ({ status: 'open' }))))

describe('Shared boards', () => {
  beforeAll(async () => {
    await request(app).get('/api')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('splits the price into equal shares, the organiser taking any odd amount, adding up to the whole', async () => {
    for (const [amountMinor, count] of [
      [67_500_000, 3],
      [100_000_001, 3],
      [7, 4],
      [50_000_000, 10],
    ]) {
      const created: { amountMinor: number; position: number; status: string; userId: string | null }[] = []

      vi.spyOn(BookingShare, 'query').mockReturnValue(fakeQuery([], created))

      await Shares.create(shared(0, 24, amountMinor), { id: 'organiser' } as unknown as User, count)

      const each = Math.floor(amountMinor / count)

      expect(created).toHaveLength(count)
      expect(created.reduce((sum, share) => sum + share.amountMinor, 0)).toBe(amountMinor)
      expect(created[0]).toMatchObject({ position: 1, userId: 'organiser', status: 'claimed', amountMinor: amountMinor - each * (count - 1) })
      expect(created.slice(1).every((share) => share.amountMinor === each && share.status === 'open' && share.userId === null)).toBe(true)
    }
  })

  it('keeps the board locked for the sharers for the hours admins set', async () => {
    useSettings({ 'shares.lock_hours': 36 })

    const booking = shared(10, 48)

    expect((await Shares.lockedUntil(booking)).getTime()).toBe(booking.createdAt.getTime() + 36 * HOUR)
  })

  it('closes bidding for the whole board early enough for the winner to pay before the hold runs out', async () => {
    useSettings({ 'shares.takeover_pay_hours': 6 })

    const booking = shared(30, 48)

    expect((await Shares.takeoverClosesAt(booking)).getTime()).toBe(booking.holdExpiresAt!.getTime() - 6 * HOUR)
  })

  it('opens the whole board to bids only after the lock, while shares are unpaid and there’s time to bid', async () => {
    useSettings({ 'shares.takeover': true, 'shares.lock_hours': 24, 'shares.takeover_pay_hours': 6 })
    vi.spyOn(Auction, 'takeoverFor').mockResolvedValue(null)
    unpaidShares(2)

    expect(await Shares.takeoverOpen(shared(23, 48))).toBe(false)
    expect(await Shares.takeoverOpen(shared(25, 48))).toBe(true)
    expect(await Shares.takeoverOpen(shared(25, 6.5))).toBe(false)

    unpaidShares(0)

    expect(await Shares.takeoverOpen(shared(25, 48))).toBe(false)
  })

  it('keeps shared boards away from bidding when admins turn it off', async () => {
    useSettings({ 'shares.takeover': false, 'shares.lock_hours': 24, 'shares.takeover_pay_hours': 6 })
    vi.spyOn(Auction, 'takeoverFor').mockResolvedValue(null)
    unpaidShares(2)

    expect(await Shares.takeoverOpen(shared(25, 48))).toBe(false)
  })

  it('stays open for bids while a running take-over auction is open, and shuts when it closes', async () => {
    useSettings({ 'shares.takeover': true, 'shares.lock_hours': 24, 'shares.takeover_pay_hours': 6 })
    unpaidShares(1)

    const auction = (closesInHours: number) => new Auction({ status: 'open', closesAt: new Date(Date.now() + closesInHours * HOUR) } as never)

    vi.spyOn(Auction, 'takeoverFor').mockResolvedValue(auction(0.5))

    expect(await Shares.takeoverOpen(shared(25, 6.5))).toBe(true)

    vi.spyOn(Auction, 'takeoverFor').mockResolvedValue(auction(-0.5))

    expect(await Shares.takeoverOpen(shared(25, 6.5))).toBe(false)
  })
})
