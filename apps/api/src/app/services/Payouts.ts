import type { Booking } from '@app/models/Booking'
import { LedgerEntry, type LedgerAccount } from '@app/models/LedgerEntry'
import { PrintJob } from '@app/models/PrintJob'

/** One share of a released booking. */
interface Share {
  account: LedgerAccount
  kind: string
  amountMinor: number
  userId: string | null
  ownerProfileId: string | null
  memo: string
}

/**
 * Moves a booking's money out of escrow once its proof is accepted, to the owner, the
 * scout, the billposter and Greyboards, by the split fixed at payment. The ledger then
 * says what each person is owed; paying it into their bank happens outside this.
 */
export class Payouts {
  /** The shares `booking` releases. They add up to what the advertiser paid. */
  static async shares(booking: Booking): Promise<Share[]> {
    const job = booking.printFeeMinor > 0 ? await PrintJob.query().where({ bookingId: booking.id }).first() : null
    const printer = Payouts.printer(booking, job)
    const shares: Share[] = [
      { account: 'owner', kind: 'payout_due', amountMinor: booking.ownerAmountMinor ?? 0, userId: null, ownerProfileId: booking.ownerProfileId, memo: 'Owner’s share' },
      { account: 'scout', kind: 'payout_due', amountMinor: booking.scoutAmountMinor ?? 0, userId: booking.scoutId, ownerProfileId: null, memo: 'Scout’s cut of the commission' },
      { ...printer, kind: 'payout_due', amountMinor: booking.printFeeMinor, memo: 'Printing and posting' },
      { account: 'platform', kind: 'commission', amountMinor: booking.platformAmountMinor ?? 0, userId: null, ownerProfileId: null, memo: 'Greyboards’ commission' },
    ]

    return shares.filter((share) => share.amountMinor > 0)
  }

  /** Who the print fee goes to: the billposter who took the job, or, when the owner's side prints, the scout who runs the board or else the owner. */
  private static printer(booking: Booking, job: PrintJob | null): Pick<Share, 'account' | 'userId' | 'ownerProfileId'> {
    if (booking.printedBy !== 'owner') return { account: 'billposter', userId: job?.billposterId ?? null, ownerProfileId: null }
    if (booking.scoutId) return { account: 'scout', userId: booking.scoutId, ownerProfileId: null }

    return { account: 'owner', userId: null, ownerProfileId: booking.ownerProfileId }
  }

  /** Record the release, once. Returns false when it was already released. */
  static async release(booking: Booking): Promise<boolean> {
    const already = await LedgerEntry.query().where({ bookingId: booking.id, account: 'escrow', kind: 'release' }).exists()

    if (already) return false

    const shares = await Payouts.shares(booking)
    const base = { bookingId: booking.id, currency: booking.currency, reference: null }

    await LedgerEntry.transaction(async () => {
      await LedgerEntry.query().create({ ...base, account: 'escrow', kind: 'release', amountMinor: -booking.amountMinor, userId: booking.advertiserId, memo: 'Proof accepted' })

      for (const share of shares) await LedgerEntry.query().create({ ...base, ...share })
    })

    return true
  }
}
