import { Booking } from '@app/models/Booking'
import { LedgerEntry } from '@app/models/LedgerEntry'
import { BookingShare } from '@app/models/BookingShare'
import { Payment } from '@app/models/Payment'
import { PrintJob } from '@app/models/PrintJob'
import { Refund } from '@app/models/Refund'
import type { User } from '@app/models/User'
import { Gateways } from '@app/services/payments/Gateways'
import type { RefundResult } from '@app/services/payments/PaymentGateway'
import { Day } from '@app/support/Day'
import { Money } from '@app/support/Money'
import { Settings } from '@app/support/Settings'
import { abortIf } from '@arkstack/common'
import { DispatchOffers } from './DispatchOffers'
import { Payouts, type Share } from './Payouts'

/** What cancelling a paid booking now gives back, or why it can't be cancelled. */
export interface CancellationQuote {
  allowed: boolean
  /** Why it can't be cancelled. */
  reason: string | null
  refundMinor: number
  /** Whether it's all the money back. */
  full: boolean
}

/** Refunds checked per run. */
const BATCH = 50

/**
 * Cancelling paid bookings and sending money back. An advertiser who cancels early gets it
 * all back; later, before the start, part of the rent, and the print fee if nothing was
 * printed. What's kept goes to the owner and Greyboards by the booking's split.
 */
export class Refunds {
  static async quote(booking: Booking): Promise<CancellationQuote> {
    const no = (reason: string): CancellationQuote => ({ allowed: false, reason, refundMinor: 0, full: false })

    if (booking.status !== Booking.PAID) return no('You can only cancel a paid booking before it starts.')
    if (booking.proofStatus !== 'none') return no('Your ad is already up, so this booking can’t be cancelled.')

    const daysLeft = Day.between(Day.today(), Day.of(booking.startsOn))

    if (daysLeft <= 0) return no('This booking has already started. Contact support if something’s wrong.')

    const printed = await Refunds.printed(booking)
    const fullDays = await Settings.number('bookings.full_refund_days')

    if (daysLeft >= fullDays && !printed) return { allowed: true, reason: null, refundMinor: booking.amountMinor, full: true }

    const percent = await Settings.number('bookings.late_refund_percent')
    const refundMinor = Math.round((booking.rentMinor() * percent) / 100) + (printed ? 0 : booking.printFeeMinor)

    return { allowed: true, reason: null, refundMinor, full: refundMinor >= booking.amountMinor }
  }

  /** The advertiser cancels a paid booking, by the cancellation terms. */
  static async cancel(booking: Booking, user: User): Promise<Refund | null> {
    const quote = await Refunds.quote(booking)

    abortIf(!quote.allowed, quote.reason ?? 'This booking can’t be cancelled.', 422)

    return Refunds.close(booking, user, quote.refundMinor, 'Cancelled by the advertiser')
  }

  /** Staff cancel a paid booking and give all the money back, such as after a dispute. */
  static async refundInFull(booking: Booking, user: User, reason: string): Promise<Refund | null> {
    abortIf(booking.status !== Booking.PAID, 'Only a paid booking whose money is still held can be refunded here.', 422)

    return Refunds.close(booking, user, booking.amountMinor, reason)
  }

  /** Staff settle a dispute: cancel a paid booking, give part back, and share the rest by the split. */
  static async partly(booking: Booking, user: User, refundMinor: number, reason: string): Promise<Refund | null> {
    abortIf(booking.status !== Booking.PAID, 'Only a paid booking whose money is still held can be refunded here.', 422)
    abortIf(refundMinor <= 0 || refundMinor >= booking.amountMinor, 'Enter an amount between zero and the full payment.', 422)

    return Refunds.close(booking, user, refundMinor, reason)
  }

  /** Send a whole payment back, such as one that landed after its dates were taken. */
  static async forPayment(booking: Booking, payment: Payment, reason: string): Promise<Refund | null> {
    return Refunds.send(booking, payment, payment.amountMinor, reason, null)
  }

  /** Check refunds still on their way. */
  static async track(): Promise<number> {
    const pending = await Refund.query().where({ status: 'processing' }).whereNotNull('providerRefundId').oldest('updatedAt').limit(BATCH).get()

    for (const refund of pending.all()) {
      const payment = await Payment.query().findOrFail(refund.paymentId)

      await Refunds.apply(refund, await Gateways.refunds(payment.provider).refundStatus(refund.providerRefundId!))
    }

    return pending.all().length
  }

  /** Whether the artwork was already printed, so the print fee can't come back. */
  private static async printed(booking: Booking): Promise<boolean> {
    const job = await PrintJob.query().where({ bookingId: booking.id }).first()

    return !!job && [PrintJob.PRINTED, PrintJob.POSTED].includes(job.status)
  }

  /** Cancel the booking, take its money out of escrow, keep the rest by the split, and send the refund. */
  private static async close(booking: Booking, user: User, refundMinor: number, reason: string): Promise<Refund | null> {
    const claimed = await Booking.query().where({ id: booking.id, status: Booking.PAID }).updateFrom({ status: Booking.CANCELLED, cancelledAt: new Date() })

    abortIf(!claimed, 'This booking just changed. Refresh and try again.', 409)

    const job = await PrintJob.query().where({ bookingId: booking.id }).first()
    const printed = !!job && [PrintJob.PRINTED, PrintJob.POSTED].includes(job.status)

    if (job && !printed) await job.update({ status: 'cancelled', dispatcherId: null, reservedUntil: null })
    if (job && !printed) await DispatchOffers.close(job)

    const kept = Refunds.keptShares(booking, job, booking.amountMinor - refundMinor, printed)
    const parts = await Refunds.split(booking, refundMinor)

    await LedgerEntry.transaction(async () => {
      const base = { bookingId: booking.id, currency: booking.currency, reference: null }

      await LedgerEntry.query().create({ ...base, account: 'escrow', kind: 'cancelled', amountMinor: -booking.amountMinor, userId: user.id, ownerProfileId: null, memo: reason })

      for (const part of parts) await LedgerEntry.query().create({ ...base, account: 'refund', kind: 'refund_due', amountMinor: part.amountMinor, userId: part.payment.userId, ownerProfileId: null, memo: reason })

      for (const share of kept) await LedgerEntry.query().create({ ...base, ...share })
    })

    const refunds = []

    for (const part of parts) refunds.push(await Refunds.send(booking, part.payment, part.amountMinor, reason, user))

    return refunds.find((refund) => refund.paymentId && parts.some((part) => part.payment.id === refund.paymentId && part.payment.userId === user.id)) ?? refunds[0] ?? null
  }

  /**
   * Who gets what of a refund: each payment that went into the booking (its rent, each share
   * of a shared booking, a dispatcher's price) in proportion to what it paid.
   */
  private static async split(booking: Booking, refundMinor: number): Promise<{ payment: Payment; amountMinor: number }[]> {
    if (refundMinor <= 0) return []

    const payments = (
      await Payment.query()
        .where({ bookingId: booking.id, status: 'complete' })
        .whereRaw('id not in (select payment_id from refunds)')
        .oldest('createdAt')
        .limit(50)
        .get()
    ).all()
    const total = payments.reduce((sum, payment) => sum + payment.amountMinor, 0)
    let left = refundMinor

    if (booking.shared) await BookingShare.query().where({ bookingId: booking.id, status: 'paid' }).updateFrom({ status: 'refunded' })

    return payments.map((payment, index) => {
      const amountMinor = index === payments.length - 1 ? left : Math.round((refundMinor * payment.amountMinor) / total)

      left -= amountMinor

      return { payment, amountMinor }
    })
  }

  /** Who keeps what the advertiser doesn't get back: the print fee if it was printed, the rest in the booking's split. */
  private static keptShares(booking: Booking, job: PrintJob | null, keptMinor: number, printed: boolean): Share[] {
    if (keptMinor <= 0) return []

    const printMinor = printed ? Math.min(booking.printFeeMinor, keptMinor) : 0
    const rentMinor = keptMinor - printMinor
    const ownerMinor = booking.ownerSharePercent === null ? 0 : Money.share(rentMinor, booking.ownerSharePercent)
    const scoutMinor = booking.rentMinor() > 0 ? Math.floor((rentMinor * (booking.scoutAmountMinor ?? 0)) / booking.rentMinor()) : 0
    const shares: Share[] = [
      { account: 'owner', kind: 'payout_due', amountMinor: ownerMinor, userId: null, ownerProfileId: booking.ownerProfileId, memo: 'Owner’s share of a late cancellation' },
      { account: 'scout', kind: 'payout_due', amountMinor: scoutMinor, userId: booking.scoutId, ownerProfileId: null, memo: 'Scout’s share of a late cancellation' },
      { ...Payouts.printer(booking, job), kind: 'payout_due', amountMinor: printMinor, memo: 'Printed before the booking was cancelled' },
      { account: 'platform', kind: 'commission', amountMinor: rentMinor - ownerMinor - scoutMinor, userId: null, ownerProfileId: null, memo: 'Greyboards’ share of a late cancellation' },
    ]

    return shares.filter((share) => share.amountMinor > 0)
  }

  private static async send(booking: Booking, payment: Payment, amountMinor: number, reason: string, user: User | null): Promise<Refund> {
    const refund = await Refund.query().create({
      bookingId: booking.id,
      paymentId: payment.id,
      amountMinor,
      currency: booking.currency,
      reason,
      status: 'processing',
      requestedById: user?.id ?? null,
    })

    await Refunds.apply(refund, await Gateways.refunds(payment.provider).refund(payment, payment.charged(amountMinor) / 100))

    return Refund.query().findOrFail(refund.id)
  }

  /** Record what the provider said. Only the first `refunded` writes to the ledger. */
  private static async apply(refund: Refund, result: RefundResult): Promise<void> {
    if (!result.final) {
      if (result.id) await refund.update({ providerRefundId: result.id, response: result.raw })

      return
    }

    if (!result.refunded) {
      await Refund.query().where({ id: refund.id, status: 'processing' }).updateFrom({ status: 'failed', failureReason: result.reason, response: result.raw, providerRefundId: result.id })

      return
    }

    await LedgerEntry.transaction(async () => {
      const claimed = await Refund.query().where({ id: refund.id, status: 'processing' }).updateFrom({ status: 'refunded', refundedAt: new Date(), response: result.raw, providerRefundId: result.id })

      if (!claimed) return

      const booking = await Booking.query().findOrFail(refund.bookingId)

      await LedgerEntry.query().create({
        bookingId: refund.bookingId,
        account: 'refund',
        kind: 'refunded',
        amountMinor: -Number(refund.amountMinor),
        currency: refund.currency,
        userId: booking.advertiserId,
        ownerProfileId: null,
        reference: result.id,
        memo: refund.reason,
      })
    })
  }
}
