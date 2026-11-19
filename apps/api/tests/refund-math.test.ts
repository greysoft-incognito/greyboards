import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import request from 'parasito'
import { app } from '../src/core/bootstrap'
import { Booking } from '@app/models/Booking'
import { BookingShare } from '@app/models/BookingShare'
import { Payment } from '@app/models/Payment'
import { PrintJob } from '@app/models/PrintJob'
import { Payouts } from '@app/services/Payouts'
import { Refunds } from '@app/services/Refunds'
import { Day } from '@app/support/Day'
import { fakeQuery, useSettings } from './support/money'

/** A paid booking: ₦500,000 rent split 70 / 20 / 10, plus `printFeeMinor`, starting `daysAway` from today. */
const booking = (daysAway = 40, printFeeMinor = 17_500_000, extra: Record<string, unknown> = {}) =>
  new Booking({
    id: 'booking-1',
    status: Booking.PAID,
    proofStatus: 'none',
    startsOn: Day.today(daysAway),
    amountMinor: 50_000_000 + printFeeMinor,
    printFeeMinor,
    printedBy: 'dispatch',
    ownerSharePercent: 70,
    ownerAmountMinor: 35_000_000,
    scoutAmountMinor: 5_000_000,
    platformAmountMinor: 10_000_000,
    scoutId: 'scout-1',
    ownerProfileId: 'profile-1',
    shared: false,
    ...extra,
  } as never)

const printJob = (status: string | null) => vi.spyOn(PrintJob, 'query').mockReturnValue(fakeQuery(status ? [{ status, dispatcherId: 'dispatcher-1' }] : []))

const sum = (parts: { amountMinor: number }[]) => parts.reduce((total, part) => total + part.amountMinor, 0)

const keptShares = (target: Booking, keptMinor: number, printed: boolean) =>
  Refunds['keptShares'](target, printed ? ({ dispatcherId: 'dispatcher-1' } as PrintJob) : null, keptMinor, printed)

const refundParts = (target: Booking, refundMinor: number, amounts: number[]) => {
  vi.spyOn(Payment, 'query').mockReturnValue(fakeQuery(amounts.map((amountMinor, index) => ({ id: `payment-${index}`, amountMinor }))))

  return Refunds['split'](target, refundMinor)
}

describe('Cancellation terms', () => {
  beforeAll(async () => {
    await request(app).get('/api')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('gives everything back for an early cancellation of a booking with nothing printed', async () => {
    useSettings({ 'bookings.full_refund_days': 7, 'bookings.late_refund_percent': 50 })
    printJob(null)

    expect(await Refunds.quote(booking(7))).toEqual({ allowed: true, reason: null, refundMinor: 67_500_000, full: true })
  })

  it('gives back part of the rent later on, and the print fee only if nothing was printed', async () => {
    useSettings({ 'bookings.full_refund_days': 7, 'bookings.late_refund_percent': 50 })
    printJob(PrintJob.OPEN)

    expect(await Refunds.quote(booking(6))).toEqual({ allowed: true, reason: null, refundMinor: 42_500_000, full: false })

    printJob(PrintJob.PRINTED)

    expect(await Refunds.quote(booking(30))).toEqual({ allowed: true, reason: null, refundMinor: 25_000_000, full: false })
  })

  it('follows the refund terms admins set', async () => {
    useSettings({ 'bookings.full_refund_days': 30, 'bookings.late_refund_percent': 80 })
    printJob(null)

    expect(await Refunds.quote(booking(29))).toMatchObject({ refundMinor: 57_500_000, full: false })
    expect(await Refunds.quote(booking(30))).toMatchObject({ refundMinor: 67_500_000, full: true })
  })

  it('can’t cancel once the booking starts, the ad is up, or it isn’t paid', async () => {
    useSettings({ 'bookings.full_refund_days': 7, 'bookings.late_refund_percent': 50 })
    printJob(null)

    expect(await Refunds.quote(booking(0))).toMatchObject({ allowed: false, refundMinor: 0 })
    expect(await Refunds.quote(booking(40, 0, { proofStatus: 'submitted' }))).toMatchObject({ allowed: false, refundMinor: 0 })
    expect(await Refunds.quote(booking(40, 0, { status: Booking.HELD }))).toMatchObject({ allowed: false, refundMinor: 0 })
  })
})

describe('What a cancellation keeps', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shares the kept rent by the booking’s split', () => {
    const kept = keptShares(booking(), 25_000_000, false)

    expect(kept.map((share) => [share.account, share.amountMinor])).toEqual([
      ['owner', 17_500_000],
      ['scout', 2_500_000],
      ['platform', 5_000_000],
    ])
  })

  it('pays a print fee already printed to whoever printed it, before splitting the rest', () => {
    const kept = keptShares(booking(), 42_500_000, true)

    expect(kept.map((share) => [share.account, share.userId, share.amountMinor])).toEqual([
      ['owner', null, 17_500_000],
      ['scout', 'scout-1', 2_500_000],
      ['dispatch', 'dispatcher-1', 17_500_000],
      ['platform', null, 5_000_000],
    ])
  })

  it('always adds up to what was kept, with no share below zero', () => {
    for (const keptMinor of [0, 1, 3, 99, 333_333, 17_500_000, 25_000_001, 67_499_999]) {
      for (const printed of [true, false]) {
        const kept = keptShares(booking(), keptMinor, printed)

        expect(sum(kept)).toBe(keptMinor)
        expect(kept.every((share) => share.amountMinor > 0)).toBe(true)
      }
    }
  })
})

describe('Sending a refund back', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('splits a refund over the payments that went in, by what each paid', async () => {
    const parts = await refundParts(booking(), 42_500_000, [50_000_000, 17_500_000])

    expect(parts.map((part) => part.amountMinor)).toEqual([31_481_481, 11_018_519])
  })

  it('marks a shared booking’s paid shares as refunded', async () => {
    const shares = vi.spyOn(BookingShare, 'query').mockReturnValue(fakeQuery([]))

    await refundParts(booking(40, 0, { shared: true }), 10_000_000, [25_000_000, 25_000_000])

    expect(shares).toHaveBeenCalled()
  })

  it('gives each payment back no more than it paid, adding up to the refund', async () => {
    for (const amounts of [
      [12_500_001, 12_500_000, 12_500_000, 12_499_999],
      [22_500_000, 22_500_000, 22_500_000],
      [50_000_000, 17_500_000],
    ]) {
      const paid = amounts.reduce((total, amount) => total + amount, 0)

      for (const refundMinor of [1_000_001, Math.floor(paid / 3), paid - 1, paid]) {
        const parts = await refundParts(booking(), refundMinor, amounts)

        expect(sum(parts)).toBe(refundMinor)

        for (const part of parts) {
          expect(part.amountMinor).toBeGreaterThan(0)
          expect(part.amountMinor).toBeLessThanOrEqual(part.payment.amountMinor)
        }
      }
    }
  })
})

describe('Payout accounts', () => {
  it('pays owners’ shares into their profile’s account and everyone else’s into their own', () => {
    expect(Payouts.holderOf({ ownerProfileId: 'profile-1', userId: 'user-1' })).toEqual({ ownerProfileId: 'profile-1' })
    expect(Payouts.holderOf({ ownerProfileId: null, userId: 'user-1' })).toEqual({ userId: 'user-1' })
    expect(Payouts.holderOf({ ownerProfileId: null, userId: null })).toBeNull()
  })
})
