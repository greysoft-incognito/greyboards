import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import request from 'parasito'
import { app } from '../src/core/bootstrap'
import type { Board } from '@app/models/Board'
import { Booking } from '@app/models/Booking'
import { PrintJob } from '@app/models/PrintJob'
import { Commissions } from '@app/services/Commissions'
import { OwnerPricing } from '@app/services/OwnerPricing'
import { Payouts } from '@app/services/Payouts'
import { Money } from '@app/support/Money'
import { DEFAULT_SPLIT, fakeQuery, useSettings } from './support/money'

/** A board run by `scout` (or by its owner when null), with an agreement signed at `signedPercent`. */
const board = (scout: string | null, signedPercent?: number) => {
  vi.spyOn(Commissions, 'scoutOf').mockResolvedValue(scout)

  return { agreements: () => fakeQuery(signedPercent ? [{ ownerSharePercent: signedPercent }] : []) } as unknown as Board
}

const total = (split: { ownerAmountMinor: number; scoutAmountMinor: number; platformAmountMinor: number }) =>
  split.ownerAmountMinor + split.scoutAmountMinor + split.platformAmountMinor

describe('Revenue split', () => {
  beforeAll(async () => {
    await request(app).get('/api')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shares the rent 70 / 20 / 10 between the owner, Greyboards and the scout', async () => {
    useSettings(DEFAULT_SPLIT)

    const split = await Commissions.split(board('scout-1'), 100_000_000)

    expect(split).toEqual({ ownerSharePercent: 70, ownerAmountMinor: 70_000_000, scoutAmountMinor: 10_000_000, platformAmountMinor: 20_000_000, scoutId: 'scout-1' })
  })

  it('gives the scout’s part to the owner on a board with no scout, or to Greyboards when set', async () => {
    useSettings(DEFAULT_SPLIT)

    expect(await Commissions.split(board(null), 100_000_000)).toMatchObject({ ownerSharePercent: 80, ownerAmountMinor: 80_000_000, scoutAmountMinor: 0, platformAmountMinor: 20_000_000 })

    useSettings({ ...DEFAULT_SPLIT, 'revenue.unscouted_to': 'platform' })

    expect(await Commissions.split(board(null), 100_000_000)).toMatchObject({ ownerSharePercent: 70, ownerAmountMinor: 70_000_000, scoutAmountMinor: 0, platformAmountMinor: 30_000_000 })
  })

  it('follows the split admins set', async () => {
    useSettings({ 'revenue.owner_percent': 60, 'revenue.platform_percent': 25, 'revenue.scout_percent': 15, 'revenue.unscouted_to': 'owner' })

    expect(await Commissions.split(board('scout-1'), 100_000_000)).toMatchObject({ ownerAmountMinor: 60_000_000, scoutAmountMinor: 15_000_000, platformAmountMinor: 25_000_000 })
    expect(await Commissions.split(board(null), 100_000_000)).toMatchObject({ ownerAmountMinor: 75_000_000, scoutAmountMinor: 0, platformAmountMinor: 25_000_000 })
  })

  it('pays the owner the share they signed for, with the scout’s part never taking more than is left', async () => {
    useSettings(DEFAULT_SPLIT)

    expect(await Commissions.split(board('scout-1', 75), 100_000_000)).toMatchObject({ ownerSharePercent: 75, ownerAmountMinor: 75_000_000, scoutAmountMinor: 10_000_000, platformAmountMinor: 15_000_000 })
    expect(await Commissions.split(board('scout-1', 95), 100_000_000)).toMatchObject({ ownerAmountMinor: 95_000_000, scoutAmountMinor: 5_000_000, platformAmountMinor: 0 })
  })

  it('always adds up to the rent, with no share below zero, whatever the amount', async () => {
    const splits = [
      [70, 20, 10],
      [33, 33, 34],
      [1, 98, 1],
      [100, 0, 0],
    ]

    for (const [owner, platform, scout] of splits) {
      useSettings({ 'revenue.owner_percent': owner, 'revenue.platform_percent': platform, 'revenue.scout_percent': scout, 'revenue.unscouted_to': 'owner' })

      for (const rent of [1, 3, 99, 333_333, 1_000_001, 12_345_679]) {
        for (const scoutId of ['scout-1', null]) {
          const split = await Commissions.split(board(scoutId), rent)

          expect(total(split)).toBe(rent)
          expect(Math.min(split.ownerAmountMinor, split.scoutAmountMinor, split.platformAmountMinor)).toBeGreaterThanOrEqual(0)
          expect(split.ownerAmountMinor).toBe(Money.share(rent, split.ownerSharePercent))
        }
      }
    }
  })
})

describe('Fixed owner amount', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('grosses the listed rate up from the owner’s amount, to a whole unit', () => {
    expect(Commissions.grossUp(10_000_000, 70)).toBe(14_285_800)
    expect(Commissions.grossUp(10_000_000, 80)).toBe(12_500_000)
    expect(Commissions.grossUp(10_000_000, 100)).toBe(10_000_000)
    expect(Commissions.grossUp(10_000_000, 0)).toBe(10_000_000)
  })

  it('lists the lowest whole-unit rate whose owner share still covers the amount', () => {
    for (let percent = 1; percent < 100; percent++) {
      for (const ownerMinor of [100, 4_200, 10_000_000, 12_345_600, 99_999_900]) {
        const listed = Commissions.grossUp(ownerMinor, percent)

        expect(listed % 100).toBe(0)
        expect(Money.share(listed, percent)).toBeGreaterThanOrEqual(ownerMinor)
        expect(Money.share(listed - 100, percent)).toBeLessThan(ownerMinor)
      }
    }
  })

  it('quotes the listed rate with the owner’s percent for scouted and self-tagged boards', async () => {
    useSettings(DEFAULT_SPLIT)

    expect(await OwnerPricing.quote(true, 10_000_000)).toEqual({ ownerPercent: 70, listedMinor: 14_285_800 })
    expect(await OwnerPricing.quote(false, 10_000_000)).toEqual({ ownerPercent: 80, listedMinor: 12_500_000 })
    expect(await OwnerPricing.quote(true, null)).toEqual({ ownerPercent: 70, listedMinor: null })

    useSettings({ ...DEFAULT_SPLIT, 'revenue.unscouted_to': 'platform' })

    expect(await OwnerPricing.quote(false, 10_000_000)).toEqual({ ownerPercent: 70, listedMinor: 14_285_800 })
  })

  it('never pays the owner less than the fixed amount, and never more than the rent', async () => {
    useSettings(DEFAULT_SPLIT)

    const listed = await Commissions.split(board('scout-1'), 14_285_800, 10_000_000)
    const discounted = await Commissions.split(board('scout-1'), 12_000_000, 10_000_000)
    const belowOwner = await Commissions.split(board('scout-1'), 8_000_000, 10_000_000)

    expect(listed).toMatchObject({ ownerAmountMinor: 10_000_060, scoutAmountMinor: 1_428_580, platformAmountMinor: 2_857_160 })
    expect(discounted).toMatchObject({ ownerAmountMinor: 10_000_000, scoutAmountMinor: 1_200_000, platformAmountMinor: 800_000 })
    expect(belowOwner).toMatchObject({ ownerAmountMinor: 8_000_000, scoutAmountMinor: 0, platformAmountMinor: 0 })
  })
})

describe('Dispatcher’s price', () => {
  /** A paid ₦500,000 booking split 70 / 20 / 10, with `printFeeMinor` paid on top. */
  const booking = (printedBy: 'owner' | 'dispatch', printFeeMinor: number, scoutId: string | null = 'scout-1') =>
    new Booking({
      id: 'booking-1',
      amountMinor: 50_000_000 + printFeeMinor,
      printFeeMinor,
      printedBy,
      ownerAmountMinor: 35_000_000,
      scoutAmountMinor: scoutId ? 5_000_000 : 0,
      platformAmountMinor: scoutId ? 10_000_000 : 15_000_000,
      scoutId,
      ownerProfileId: 'profile-1',
    } as never)

  const job = (bonusMinor = 0) => vi.spyOn(PrintJob, 'query').mockReturnValue(fakeQuery([{ dispatcherId: 'dispatcher-1', bonusMinor }]))

  const paid = (shares: { account: string; amountMinor: number }[]) =>
    shares.reduce<Record<string, number>>((sums, share) => ({ ...sums, [share.account]: (sums[share.account] ?? 0) + share.amountMinor }), {})

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('is paid to the dispatcher on top of the rent, leaving the rent’s split as it was', async () => {
    job()

    const shares = await Payouts.shares(booking('dispatch', 17_500_000))

    expect(paid(shares)).toEqual({ owner: 35_000_000, scout: 5_000_000, dispatch: 17_500_000, platform: 10_000_000 })
    expect(shares.find((share) => share.account === 'dispatch')?.userId).toBe('dispatcher-1')
    expect(shares.reduce((sum, share) => sum + share.amountMinor, 0)).toBe(67_500_000)
  })

  it('pays a rush bonus out of Greyboards’ share, never more than that share', async () => {
    job(4_375_000)

    expect(paid(await Payouts.shares(booking('dispatch', 17_500_000)))).toEqual({ owner: 35_000_000, scout: 5_000_000, dispatch: 21_875_000, platform: 5_625_000 })

    job(50_000_000)

    const capped = await Payouts.shares(booking('dispatch', 17_500_000))

    expect(paid(capped)).toEqual({ owner: 35_000_000, scout: 5_000_000, dispatch: 27_500_000 })
    expect(capped.reduce((sum, share) => sum + share.amountMinor, 0)).toBe(67_500_000)
  })

  it('goes to the scout, or else the owner, when the owner’s side prints', async () => {
    job()

    expect(paid(await Payouts.shares(booking('owner', 17_500_000)))).toEqual({ owner: 35_000_000, scout: 22_500_000, platform: 10_000_000 })
    expect(paid(await Payouts.shares(booking('owner', 17_500_000, null)))).toEqual({ owner: 52_500_000, platform: 15_000_000 })
  })
})
