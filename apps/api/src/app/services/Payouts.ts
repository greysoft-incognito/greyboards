import type { Booking } from '@app/models/Booking'
import { LedgerEntry, type LedgerAccount } from '@app/models/LedgerEntry'
import { Payout } from '@app/models/Payout'
import { PayoutAccount, type PayoutHolder } from '@app/models/PayoutAccount'
import { PrintJob } from '@app/models/PrintJob'
import { Gateways } from '@app/services/payments/Gateways'
import type { TransferResult } from '@app/services/payments/PaymentGateway'
import { Settings } from '@app/support/Settings'
import { abortIf } from '@arkstack/common'
import { randomBytes } from 'node:crypto'

/** Shares paid out or checked per run, so one run stays short. */
const BATCH = 50

/** One share of a released booking. */
export interface Share {
  account: LedgerAccount
  kind: string
  amountMinor: number
  userId: string | null
  ownerProfileId: string | null
  memo: string
}

/**
 * Moves a booking's money out of escrow once its proof is accepted, to the owner, the
 * scout, the dispatcher and Greyboards, by the split fixed at payment, then sends each
 * share to its person's bank account once the hold days pass. The ledger records both.
 */
export class Payouts {
  /** The shares `booking` releases. They add up to what the advertiser paid. */
  static async shares(booking: Booking): Promise<Share[]> {
    const job = booking.printFeeMinor > 0 ? await PrintJob.query().where({ bookingId: booking.id }).first() : null
    const printer = Payouts.printer(booking, job)
    const bonus = booking.printedBy === 'dispatch' && job ? Math.min(Number(job.bonusMinor ?? 0), booking.platformAmountMinor ?? 0) : 0
    const shares: Share[] = [
      { account: 'owner', kind: 'payout_due', amountMinor: booking.ownerAmountMinor ?? 0, userId: null, ownerProfileId: booking.ownerProfileId, memo: 'Owner’s share' },
      { account: 'scout', kind: 'payout_due', amountMinor: booking.scoutAmountMinor ?? 0, userId: booking.scoutId, ownerProfileId: null, memo: 'Scout’s share' },
      { ...printer, kind: 'payout_due', amountMinor: booking.printFeeMinor + bonus, memo: bonus ? 'Printing and posting, with a rush bonus' : 'Printing and posting' },
      { account: 'platform', kind: 'commission', amountMinor: (booking.platformAmountMinor ?? 0) - bonus, userId: null, ownerProfileId: null, memo: 'Greyboards’ share' },
    ]

    return shares.filter((share) => share.amountMinor > 0)
  }

  /** Who the print fee goes to: the dispatcher who took the job, or, when the owner's side prints, the scout who runs the board or else the owner. */
  static printer(booking: Booking, job: PrintJob | null): Pick<Share, 'account' | 'userId' | 'ownerProfileId'> {
    if (booking.printedBy !== 'owner') return { account: 'dispatch', userId: job?.dispatcherId ?? null, ownerProfileId: null }
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

  /** Send shares owed past the hold days to the bank accounts on file. Shares whose person has no account yet wait. */
  static async send(): Promise<number> {
    if (!(await Settings.get('payouts.enabled'))) return 0

    const holdDays = await Settings.number('payouts.hold_days')
    const due = await LedgerEntry.query()
      .where({ kind: 'payout_due' })
      .whereRaw('amount_minor > 0')
      .whereRaw('"createdAt" < now() - make_interval(days => ?)', [holdDays])
      .whereRaw('id not in (select ledger_entry_id from payouts)')
      .whereRaw(
        `(owner_profile_id in (select owner_profile_id from payout_accounts)
          or owner_profile_id in (select owner_profiles.id from owner_profiles join payout_accounts on payout_accounts.user_id = owner_profiles.user_id)
          or (owner_profile_id is null and user_id in (select user_id from payout_accounts)))`,
      )
      .oldest('createdAt')
      .limit(BATCH)
      .get()

    for (const entry of due.all()) {
      const holder = Payouts.holderOf(entry)
      const account = holder ? await PayoutAccount.payee(holder) : null

      if (account) await Payouts.pay(entry, account)
    }

    return due.all().length
  }

  /** Ask the provider about transfers still on their way. */
  static async track(): Promise<number> {
    const gateway = Gateways.payouts()
    const pending = await Payout.query().where({ status: 'processing' }).whereRaw('"updatedAt" < now() - interval \'1 minute\'').oldest('updatedAt').limit(BATCH).get()

    for (const payout of pending.all()) await Payouts.apply(payout, await gateway.transferStatus(payout.reference))

    return pending.all().length
  }

  /** Send a failed payout again, to the account on file now. */
  static async retry(payout: Payout): Promise<Payout> {
    abortIf(payout.status !== 'failed', 'Only a failed payout can be sent again.', 422)

    const entry = await LedgerEntry.query().findOrFail(payout.ledgerEntryId)
    const holder = Payouts.holderOf(entry)
    const account = holder ? await PayoutAccount.payee(holder) : null

    abortIf(!account, 'There is no bank account to pay this into yet.', 422)

    await payout.update({ ...Payouts.bankDetails(account!), reference: Payouts.reference(), status: 'processing', failureReason: null })
    await Payouts.transfer(payout)

    return Payout.query().findOrFail(payout.id)
  }

  /** Whose bank account a share goes to: the owner profile for owners' shares, else the person. */
  static holderOf(entry: Pick<LedgerEntry, 'userId' | 'ownerProfileId'>): PayoutHolder | null {
    if (entry.ownerProfileId) return { ownerProfileId: entry.ownerProfileId }
    if (entry.userId) return { userId: entry.userId }

    return null
  }

  private static async pay(entry: LedgerEntry, account: PayoutAccount): Promise<void> {
    const payout = await Payout.query().create({
      ledgerEntryId: entry.id,
      bookingId: entry.bookingId,
      account: entry.account,
      userId: entry.userId,
      ownerProfileId: entry.ownerProfileId,
      amountMinor: Number(entry.amountMinor),
      currency: entry.currency,
      ...Payouts.bankDetails(account),
      reference: Payouts.reference(),
      provider: Gateways.payouts().key,
      status: 'processing',
    })

    await Payouts.transfer(payout)
  }

  private static async transfer(payout: Payout): Promise<void> {
    const result = await Gateways.payouts().transfer({
      reference: payout.reference,
      amount: Number(payout.amountMinor) / 100,
      currency: payout.currency,
      bankCode: payout.bankCode,
      accountNumber: payout.accountNumber,
      narration: `Greyboards ${payout.account} payout`,
    })

    await Payouts.apply(payout, result)
  }

  /** Record what the provider said. Only the first `paid` writes to the ledger. */
  private static async apply(payout: Payout, result: TransferResult): Promise<void> {
    if (!result.final) return

    if (!result.paid) {
      await Payout.query().where({ id: payout.id, status: 'processing' }).updateFrom({ status: 'failed', failureReason: result.reason, response: result.raw })

      return
    }

    await LedgerEntry.transaction(async () => {
      const claimed = await Payout.query().where({ id: payout.id, status: 'processing' }).updateFrom({ status: 'paid', paidAt: new Date(), response: result.raw })

      if (!claimed) return

      await LedgerEntry.query().create({
        bookingId: payout.bookingId,
        account: payout.account,
        kind: 'paid_out',
        amountMinor: -Number(payout.amountMinor),
        currency: payout.currency,
        userId: payout.userId,
        ownerProfileId: payout.ownerProfileId,
        reference: payout.reference,
        memo: `Paid to ${payout.bankName} ••••${payout.accountNumber.slice(-4)}`,
      })
    })
  }

  private static bankDetails(account: PayoutAccount) {
    return { bankCode: account.bankCode, bankName: account.bankName, accountNumber: account.accountNumber, accountName: account.accountName }
  }

  private static reference(): string {
    return `${config('payments.reference_prefix')}po_${randomBytes(8).toString('hex')}`
  }
}
