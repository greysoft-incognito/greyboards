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
  /** The scout who runs the board, paid from Greyboards' commission. */
  scoutId: string | null
}

/**
 * The one place that decides who gets what from a booking. A board a scout runs pays the
 * owner the share they signed for; a board its owner runs pays them all but the commission.
 * The scout's cut comes out of Greyboards' commission, so owners pay one clear rate.
 */
export class Commissions {
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

  static async split(board: Board, amountMinor: number): Promise<Split> {
    const scoutId = await Commissions.scoutOf(board)
    const signed = scoutId ? await board.agreements().where({ status: BoardAgreement.SIGNED }).first() : null
    const ownerSharePercent = signed ? signed.ownerSharePercent : 100 - (await Settings.number('bookings.commission_percent'))
    const ownerAmountMinor = Money.share(amountMinor, ownerSharePercent)
    const commission = amountMinor - ownerAmountMinor
    const scoutAmountMinor = scoutId ? Money.share(commission, await Settings.number('bookings.scout_share_percent')) : 0

    return { ownerSharePercent, ownerAmountMinor, scoutAmountMinor, platformAmountMinor: commission - scoutAmountMinor, scoutId }
  }
}
