import { LedgerEntry } from '@app/models/LedgerEntry'
import { Payout } from '@app/models/Payout'
import { PayoutAccount } from '@app/models/PayoutAccount'
import { Gateways } from '@app/services/payments/Gateways'
import { Payouts } from '@app/services/Payouts'
import { Settings } from '@app/support/Settings'
import { MockSeeder } from '../MockSeeder'
import type { MockBookingRecord } from './MockBookingSeeder'

/**
 * Bank transfers for shares released longer ago than the hold days: paid, apart from one the
 * bank turned back. Shares released more recently are left owed, as they would be.
 */
export class MockPayoutSeeder extends MockSeeder {
  async run(): Promise<void> {
    const holdDays = await Settings.number('payouts.hold_days')
    const provider = (await Gateways.payouts()).key
    const settled = this.data.all<MockBookingRecord>('bookings').filter((booking) => booking.acceptedAt && booking.acceptedAt < this.data.at(-holdDays))
    const payouts = []
    const ledger = []

    for (const booking of settled) {
      const shares = await LedgerEntry.query().where({ bookingId: booking.id, kind: 'payout_due' }).limit(10).get()

      for (const share of shares.all()) {
        const holder = Payouts.holderOf(share)
        const account = holder ? await PayoutAccount.payee(holder) : null

        if (!account) continue

        const failed = booking.plan.seed.failedPayout === share.account
        const paidAt = new Date(booking.acceptedAt!.getTime() + (holdDays * 24 + 2) * 3_600_000)
        const reference = `gbd_mock_po_${this.data.token(8)}`

        payouts.push({
          id: this.data.id(),
          ledgerEntryId: share.id,
          bookingId: booking.id,
          account: share.account,
          userId: share.userId,
          ownerProfileId: share.ownerProfileId,
          amountMinor: Number(share.amountMinor),
          currency: share.currency,
          bankCode: account.bankCode,
          bankName: account.bankName,
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          reference,
          provider,
          status: failed ? 'failed' : 'paid',
          failureReason: failed ? 'The account name doesn’t match the bank’s records.' : null,
          paidAt: failed ? null : paidAt,
          createdAt: paidAt,
          updatedAt: paidAt,
        })

        if (failed) continue

        ledger.push({
          id: this.data.id(),
          bookingId: booking.id,
          account: share.account,
          kind: 'paid_out',
          amountMinor: -Number(share.amountMinor),
          currency: share.currency,
          userId: share.userId,
          ownerProfileId: share.ownerProfileId,
          reference,
          memo: `Paid to ${account.bankName} ••••${account.accountNumber.slice(-4)}`,
          createdAt: paidAt,
          updatedAt: paidAt,
        })
      }
    }

    await this.data.insert(Payout, payouts)
    await this.data.insert(LedgerEntry, ledger)
  }
}
