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
 * first, apart from this; the rent left is shared between the owner, Greyboards and the
 * scout who brought the board in, by the revenue split admins set. A board a scout runs
 * pays the owner the share they signed for. With no scout, the scout's part goes where
 * the split says.
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

  /** Share `rentMinor`, the booking's rent. Printing and posting is paid on top and isn't part of it. */
  static async split(board: Board, rentMinor: number): Promise<Split> {
    const revenue = await Commissions.revenue()
    const scoutId = await Commissions.scoutOf(board)
    const signed = scoutId ? await board.agreements().where({ status: BoardAgreement.SIGNED }).first() : null
    const ownerSharePercent = signed ? signed.ownerSharePercent : revenue.owner + (revenue.unscoutedTo === 'owner' ? revenue.scout : 0)
    const scoutPercent = scoutId ? Math.min(revenue.scout, 100 - ownerSharePercent) : 0
    const ownerAmountMinor = Money.share(rentMinor, ownerSharePercent)
    const scoutAmountMinor = Money.share(rentMinor, scoutPercent)

    return { ownerSharePercent, ownerAmountMinor, scoutAmountMinor, platformAmountMinor: rentMinor - ownerAmountMinor - scoutAmountMinor, scoutId }
  }
}
