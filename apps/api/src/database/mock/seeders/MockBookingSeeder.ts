import { Board } from '@app/models/Board'
import { BoardFace } from '@app/models/BoardFace'
import { Booking } from '@app/models/Booking'
import { BookingShare } from '@app/models/BookingShare'
import { LedgerEntry } from '@app/models/LedgerEntry'
import { Payment } from '@app/models/Payment'
import { PrintJob } from '@app/models/PrintJob'
import { Refund } from '@app/models/Refund'
import { Commissions, type Split } from '@app/services/Commissions'
import { DigitalSlots } from '@app/services/DigitalSlots'
import { OwnerPricing } from '@app/services/OwnerPricing'
import { PaymentRegions } from '@app/services/payments/PaymentRegions'
import { Money } from '@app/support/Money'
import { AUCTIONS, BOOKINGS, OFFERS, type MockBookingSeed } from '../content/campaigns'
import type { MockRecord } from '../MockData'
import { MockBookingPlan } from '../MockBookingPlan'
import { MockSeeder } from '../MockSeeder'

/** A seeded booking and what later seeders need to know about it. */
export interface MockBookingRecord extends MockRecord {
  plan: MockBookingPlan
  boardId: string
  faceId: string
  advertiserId: string
  startsOn: string
  endsOn: string
  amountMinor: number
  rentMinor: number
  currency: string
  ratePeriod: string
  ownerProfileId: string | null
  printedBy: 'owner' | 'dispatch'
  bookedAt: Date
  acceptedAt: Date | null
  proofAt?: Date | null
  split: Split | null
}

/**
 * Bookings in every state with what the advertiser paid, the split fixed at payment, the
 * artwork they sent and the escrow lines. Shared bookings get their shares and designs, and the
 * cancelled booking its refund.
 */
export class MockBookingSeeder extends MockSeeder {
  private provider = ''

  async run(): Promise<void> {
    this.provider = await PaymentRegions.defaultProvider()

    const bookings = []
    const payments: Record<string, unknown>[] = []
    const shares: Record<string, unknown>[] = []
    const ledger: Record<string, unknown>[] = []
    const refunds: Record<string, unknown>[] = []

    for (const seed of BOOKINGS) {
      const record = await this.plan(seed)

      bookings.push(await this.row(record))

      if (seed.shares) shares.push(...(await this.shares(record, payments)))
      else if (record.plan.paid) payments.push(this.payment(record, record.advertiserId, record.amountMinor - this.dispatchFee(record)))

      if (record.plan.stage === 'cancelled') refunds.push(this.refund(record, payments.at(-1)!))
    }

    for (const payment of payments) ledger.push(...this.ledgerFor(payment, refunds))

    await this.data.insert(Booking, bookings)
    await this.data.insert(Payment, payments)
    await this.data.insert(BookingShare, shares)
    await this.data.insert(Refund, refunds)
    await this.data.insert(LedgerEntry, ledger)
  }

  /** Work out the booking's dates, price and split from its seed. */
  private async plan(seed: MockBookingSeed): Promise<MockBookingRecord> {
    const plan = new MockBookingPlan(seed)
    const board = await Board.query().findOrFail(this.data.get('boards', seed.board).id)
    const face = await BoardFace.query().findOrFail(this.data.get('faces', `${seed.board}:${seed.face ?? 1}`).id)
    const startsOn = this.data.day(seed.startsIn)
    const rentMinor = await this.rent(seed, board, face)
    const ownerPrintMinor = await PrintJob.feeFor(board)
    const dispatchMinor = plan.reached('printing') && seed.dispatcher ? seed.dispatcher.amount * 100 : 0
    const bookedAt = this.bookedAt(seed)
    const split = plan.paid ? await Commissions.split(board, rentMinor, await OwnerPricing.fixedFor(board, face.id, seed.periods)) : null

    return this.data.keep<MockBookingRecord>('bookings', seed.key, {
      id: this.data.id(),
      plan,
      boardId: board.id,
      faceId: face.id,
      advertiserId: this.data.get('users', seed.advertiser).id,
      startsOn,
      endsOn: Booking.endOf(startsOn, seed.periods, board.ratePeriod),
      amountMinor: rentMinor + ownerPrintMinor + dispatchMinor,
      rentMinor,
      currency: board.currency,
      ratePeriod: board.ratePeriod,
      ownerProfileId: board.ownerProfileId,
      printedBy: ownerPrintMinor > 0 ? 'owner' : 'dispatch',
      bookedAt,
      acceptedAt: plan.released ? this.acceptedAt(seed, startsOn) : null,
      split,
    })
  }

  /** The rent: the board's rate, a screen's price for the slots, or what an offer or a winning bid agreed. */
  private async rent(seed: MockBookingSeed, board: Board, face: BoardFace): Promise<number> {
    const list = Number(board.rateFor(face)) * seed.periods
    const offer = OFFERS.find((entry) => entry.booking === seed.key)
    const auction = AUCTIONS.find((entry) => entry.booking === seed.key)

    if (offer) return Math.round((list * offer.percent) / 10_000) * 100
    if (auction) return Math.round((list * auction.bids.at(-1)![1]) / 10_000) * 100
    if (seed.slots) return (await DigitalSlots.price(board, face, seed.slots.slots, seed.slots.daypart)) * seed.periods

    return list
  }

  private async row(record: MockBookingRecord): Promise<Record<string, unknown>> {
    const { plan } = record
    const seed = plan.seed
    const slots = seed.slots ? { ...seed.slots, ...this.hours(seed.slots.daypart) } : DigitalSlots.WHOLE
    const paidAt = plan.paid ? new Date(record.bookedAt.getTime() + 20 * 60_000) : null
    const artwork = plan.reached('artwork_submitted') ? await this.data.images.artwork(`bookings/${record.id}/artwork`, seed.ad, this.ratio(seed.board)) : null
    const artworkReviewer = this.data.get('boards', seed.board).taggedById as string
    const proofAt = plan.hasProof ? this.proofSubmittedAt(record) : null

    record.proofAt = proofAt

    return {
      id: record.id,
      boardId: record.boardId,
      faceId: record.faceId,
      advertiserId: record.advertiserId,
      startsOn: record.startsOn,
      endsOn: record.endsOn,
      periods: seed.periods,
      ratePeriod: record.ratePeriod,
      rateMinor: Math.round(record.rentMinor / seed.periods),
      amountMinor: record.amountMinor,
      printFeeMinor: record.amountMinor - record.rentMinor,
      printedBy: record.printedBy,
      currency: record.currency,
      status: plan.status,
      holdExpiresAt: plan.stage === 'held' ? (seed.shares ? this.data.at(2) : this.data.at(0, 0.25)) : null,
      ...(record.split ?? {}),
      ownerProfileId: record.ownerProfileId,
      paidAt,
      cancelledAt: plan.stage === 'cancelled' ? this.data.at(-1) : null,
      source: seed.source ?? 'book',
      shared: !!seed.shares,
      artworkPath: artwork?.path ?? null,
      artworkDisk: artwork?.disk ?? null,
      artworkWidth: artwork?.width ?? null,
      artworkHeight: artwork?.height ?? null,
      artworkStatus: plan.artworkStatus,
      artworkReviewedById: plan.reached('artwork_approved') ? artworkReviewer : null,
      artworkReviewedAt: plan.reached('artwork_approved') ? new Date(record.bookedAt.getTime() + 86_400_000) : null,
      proofStatus: plan.proofStatus,
      proofNote: plan.stage === 'proof_disputed' ? (seed.proofNote ?? null) : null,
      proofSubmittedAt: proofAt,
      proofAcceptedAt: record.acceptedAt,
      releasedAt: record.acceptedAt,
      ...slots,
      createdAt: record.bookedAt,
      updatedAt: record.acceptedAt ?? proofAt ?? paidAt ?? record.bookedAt,
    }
  }

  /** One share per seat on a shared booking, the payments for the paid ones and their designs. */
  private async shares(record: MockBookingRecord, payments: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
    const seeds = record.plan.seed.shares!
    const amounts = Money.allocate(record.amountMinor - this.dispatchFee(record), seeds.map(() => 1))
    const rows = []

    for (const [index, share] of seeds.entries()) {
      const id = this.data.id()
      const userId = this.data.find('users', share.user)?.id ?? null
      const payment = share.paid && userId ? this.payment(record, userId, amounts[index]!, [id]) : null
      const design = share.paid && share.ad ? await this.data.images.artwork(`bookings/${record.id}/designs`, share.ad, this.ratio(record.plan.seed.board)) : null

      if (payment) payments.push(payment)

      rows.push({
        id,
        bookingId: record.id,
        userId,
        position: index + 1,
        amountMinor: amounts[index],
        status: share.paid ? 'paid' : 'open',
        token: this.data.token(),
        paymentId: payment?.id ?? null,
        paidAt: payment?.paidAt ?? null,
        designPath: design?.path ?? null,
        designDisk: design?.disk ?? null,
        designWidth: design?.width ?? null,
        designHeight: design?.height ?? null,
        designSentAt: design ? new Date(record.bookedAt.getTime() + 2 * 3_600_000) : null,
        ...this.data.stamps(-2),
      })
    }

    return rows
  }

  private payment(record: MockBookingRecord, userId: string, amountMinor: number, shareIds?: string[]): Record<string, unknown> {
    const paidAt = new Date(record.bookedAt.getTime() + 20 * 60_000)

    return {
      id: this.data.id(),
      userId,
      bookingId: record.id,
      reference: `gbd_mock_${this.data.token(8)}`,
      provider: this.provider,
      status: 'complete',
      amountMinor,
      currency: record.currency,
      chargeAmountMinor: amountMinor,
      chargeCurrency: record.currency,
      exchangeRate: 1,
      shareIds: shareIds ? JSON.stringify(shareIds) : null,
      paidAt,
      createdAt: record.bookedAt,
      updatedAt: paidAt,
    }
  }

  private refund(record: MockBookingRecord, payment: Record<string, unknown>): Record<string, unknown> {
    return {
      id: this.data.id(),
      bookingId: record.id,
      paymentId: payment.id,
      amountMinor: payment.amountMinor,
      currency: record.currency,
      reason: 'Our launch moved to January, so we cancelled.',
      status: 'refunded',
      providerRefundId: `mock_rf_${this.data.token(6)}`,
      requestedById: record.advertiserId,
      refundedAt: this.data.at(-1, 2),
      ...this.data.stamps(-1),
    }
  }

  /** Escrow lines for a payment and, for a refunded booking, the cancellation and refund. */
  private ledgerFor(payment: Record<string, unknown>, refunds: Record<string, unknown>[]): Record<string, unknown>[] {
    const base = { bookingId: payment.bookingId, currency: payment.currency, userId: payment.userId, ownerProfileId: null }
    const amount = Number(payment.amountMinor)
    const lines = [{ id: this.data.id(), ...base, account: 'escrow', kind: 'payment_in', amountMinor: amount, reference: payment.reference, memo: 'Held until the artwork is up', createdAt: payment.paidAt, updatedAt: payment.paidAt }]
    const refund = refunds.find((entry) => entry.paymentId === payment.id)

    if (!refund) return lines

    const memo = String(refund.reason)
    const at = refund.createdAt as Date

    return [
      ...lines,
      { id: this.data.id(), ...base, account: 'escrow', kind: 'cancelled', amountMinor: -amount, reference: payment.reference, memo, createdAt: at, updatedAt: at },
      { id: this.data.id(), ...base, account: 'refund', kind: 'refund_due', amountMinor: amount, reference: payment.reference, memo, createdAt: at, updatedAt: at },
      { id: this.data.id(), ...base, account: 'refund', kind: 'refunded', amountMinor: -amount, reference: refund.providerRefundId, memo, createdAt: refund.refundedAt, updatedAt: refund.refundedAt },
    ]
  }

  /** What the dispatcher's price added on top, paid in its own checkout. */
  private dispatchFee(record: MockBookingRecord): number {
    return record.printedBy === 'dispatch' ? record.amountMinor - record.rentMinor : 0
  }

  /** When the advertiser booked: holds just now, everything else far enough back for the later steps to have happened. */
  private bookedAt(seed: MockBookingSeed): Date {
    if (seed.stage === 'held') return seed.shares ? this.data.at(-1) : this.data.at(0, -0.2)
    if (seed.stage === 'expired') return this.data.at(-2)

    return this.data.at(Math.min(seed.startsIn - 12, -6), -3)
  }

  private acceptedAt(seed: MockBookingSeed, startsOn: string): Date {
    const accepted = this.data.on(startsOn, 15).getTime() + 2 * 86_400_000

    return new Date(Math.min(accepted, this.data.at(-1).getTime()))
  }

  private proofSubmittedAt(record: MockBookingRecord): Date {
    const submitted = this.data.on(record.startsOn, 10).getTime() + 86_400_000

    return new Date(Math.min(submitted, this.data.at(0, -6).getTime()))
  }

  private hours(daypart: keyof typeof DigitalSlots.HOURS): { hourFrom: number; hourTo: number } {
    const [hourFrom, hourTo] = DigitalSlots.HOURS[daypart]

    return { hourFrom, hourTo }
  }

  private ratio(boardKey: string): number {
    const seed = this.data.get('boards', boardKey).seed as { widthM: number; heightM: number }

    return seed.widthM / seed.heightM
  }
}
