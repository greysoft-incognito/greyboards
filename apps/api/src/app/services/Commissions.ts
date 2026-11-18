import type { Board } from '@app/models/Board'
import { BoardAgreement } from '@app/models/BoardAgreement'
import { OwnerProfile } from '@app/models/OwnerProfile'
import { Money } from '@app/support/Money'
import { Settings } from '@app/support/Settings'

/** How one booking's money is shared out. Amounts are in minor units and add up to the whole. */
export interface Split {
  ownerSharePercent: number
  ownerAmountMinor: number
  scoutAmountMinor: number
  platformAmountMinor: number
  /** The scout who brought the board in. */
  scoutId: string | null
}

/** The revenue split in use: percents of the rent that add up to 100. */
export interface RevenueSplit {
  owner: number
  platform: number
  scout: number
  unscoutedTo: 'owner' | 'platform'
}

/**
 * The one place that decides who gets what from a booking. Printing and posting is paid
 * on top of the rent, apart from this; the rent is shared between the owner, Greyboards
 * and the scout who brought the board in, by the revenue split admins set. A board a scout
 * runs pays the owner the share they signed for. With no scout, the scout's part goes where
 * the split says.
 *
 * On a board whose tagger fixed what the owner receives, the listed rate is grossed up so the
 * owner's share comes to that amount, and the split never pays the owner less than it.
 */
export class Commissions {
  static async revenue(): Promise<RevenueSplit> {
    const unscoutedTo = await Settings.get<string>('revenue.unscouted_to')

    return {
      owner: await Settings.number('revenue.owner_percent'),
      platform: await Settings.number('revenue.platform_percent'),
      scout: await Settings.number('revenue.scout_percent'),
      unscoutedTo: unscoutedTo === 'platform' ? 'platform' : 'owner',
    }
  }

  /** The scout running `board`, or null when its owner tagged it. */
  static async scoutOf(board: Board): Promise<string | null> {
    if (!board.taggedById) return null

    const profile = board.ownerProfileId ? await OwnerProfile.query().find(board.ownerProfileId) : null

    return profile?.userId === board.taggedById ? null : board.taggedById
  }

  /** Why `board` can't take bookings yet, or null when it can. */
  static async blocker(board: Board): Promise<string | null> {
    if (!board.isListed()) return 'This board isn’t on the map.'
    if (board.rate() === null) return 'This board has no price yet.'
    if (!(await Commissions.scoutOf(board))) return null

    const signed = await board.agreements().where({ status: BoardAgreement.SIGNED }).exists()

    return signed ? null : 'The owner hasn’t signed for this board yet, so it can’t be booked.'
  }

  /**
   * Share `rentMinor`, the booking's rent. Printing and posting is paid on top and isn't part of it.
   * `ownerFixedMinor` is the least the owner gets, on a board whose tagger fixed it.
   */
  static async split(board: Board, rentMinor: number, ownerFixedMinor = 0): Promise<Split> {
    const revenue = await Commissions.revenue()
    const scoutId = await Commissions.scoutOf(board)
    const ownerSharePercent = await Commissions.ownerPercent(board, revenue, scoutId)
    const scoutPercent = scoutId ? Math.min(revenue.scout, 100 - ownerSharePercent) : 0
    const ownerAmountMinor = Math.max(Money.share(rentMinor, ownerSharePercent), Math.min(ownerFixedMinor, rentMinor))
    const scoutAmountMinor = Math.min(Money.share(rentMinor, scoutPercent), rentMinor - ownerAmountMinor)

    return { ownerSharePercent, ownerAmountMinor, scoutAmountMinor, platformAmountMinor: rentMinor - ownerAmountMinor - scoutAmountMinor, scoutId }
  }

  /** The percent of the rent `board`'s owner gets: what they signed for, or the split's owner part (with the scout's, on boards with no scout, when the split says so). */
  static async ownerPercent(board: Board, revenue?: RevenueSplit, scoutId?: string | null): Promise<number> {
    const split = revenue ?? (await Commissions.revenue())
    const scout = scoutId === undefined ? await Commissions.scoutOf(board) : scoutId
    const signed = scout ? await board.agreements().where({ status: BoardAgreement.SIGNED }).first() : null

    if (signed) return signed.ownerSharePercent

    return Commissions.ownerPercentFor(!!scout, split)
  }

  /** The owner's percent on a board a scout runs, or one its owner tagged. */
  static ownerPercentFor(scouted: boolean, revenue: RevenueSplit): number {
    return scouted ? revenue.owner : revenue.owner + (revenue.unscoutedTo === 'owner' ? revenue.scout : 0)
  }

  /** The rate to list so that `percent` of it is at least `ownerMinor`, rounded up to a whole unit. */
  static grossUp(ownerMinor: number, percent: number): number {
    if (percent <= 0 || percent >= 100) return ownerMinor

    return Math.ceil((ownerMinor * 100) / percent / 100) * 100
  }
}
