import { abortIf } from '@arkstack/common'
import { randomBytes } from 'node:crypto'
import { Booking } from '@app/models/Booking'
import { BookingShare } from '@app/models/BookingShare'
import { Payment } from '@app/models/Payment'
import type { User } from '@app/models/User'
import { Refunds } from './Refunds'

/**
 * Shared (co-op) bookings. The organiser holds the dates for everyone and invites the others
 * by link; each pays their own share into escrow. The booking is paid once every share is,
 * and the organiser may cover shares nobody paid. If the hold runs out first, everyone who
 * paid gets their money back.
 */
export class Shares {
  /** Split a new held booking into `count` equal shares. The organiser takes the first, with any odd amount. */
  static async create(booking: Booking, organiser: User, count: number): Promise<void> {
    const each = Math.floor(booking.amountMinor / count)
    const first = booking.amountMinor - each * (count - 1)

    for (let position = 1; position <= count; position++) {
      await BookingShare.query().create({
        bookingId: booking.id,
        userId: position === 1 ? organiser.id : null,
        position,
        amountMinor: position === 1 ? first : each,
        status: position === 1 ? 'claimed' : 'open',
        token: randomBytes(16).toString('hex'),
      })
    }
  }

  static of(booking: Booking) {
    return BookingShare.query().where({ bookingId: booking.id }).oldest('position').limit(50).get()
  }

  /** The share behind an invite link, with its booking. */
  static async byToken(token: string): Promise<{ share: BookingShare; booking: Booking }> {
    const share = await BookingShare.query().where({ token }).first()
    const booking = share ? await Booking.query().find(share.bookingId) : null

    abortIf(!share || !booking, 'This invite link isn’t valid.', 404)

    return { share: share!, booking: booking! }
  }

  /** Whether `user` holds a share of the booking. */
  static holds(user: User, booking: Booking): Promise<boolean> {
    return BookingShare.query().where({ bookingId: booking.id, userId: user.id }).exists()
  }

  /** Take an open share from its invite link. One share per advertiser per booking. */
  static async claim(share: BookingShare, booking: Booking, user: User): Promise<void> {
    abortIf(!booking.isHeld(), 'This shared booking is no longer waiting for payments.', 422)
    abortIf(share.userId === user.id, 'This share is already yours.', 422)
    abortIf(share.status !== 'open', 'Someone already took this share.', 409)
    abortIf(await Shares.holds(user, booking), 'You already have a share of this booking.', 422)

    const claimed = await BookingShare.query().where({ id: share.id, status: 'open' }).updateFrom({ userId: user.id, status: 'claimed' })

    abortIf(!claimed, 'Someone already took this share.', 409)
  }

  /** The organiser takes every share nobody paid yet, so they can pay the rest themselves. */
  static async cover(booking: Booking, organiser: User): Promise<number> {
    abortIf(!booking.shared || booking.advertiserId !== organiser.id, 'Only the organiser of a shared booking can cover the rest.', 403)
    abortIf(!booking.isHeld(), 'This shared booking is no longer waiting for payments.', 422)

    return BookingShare.query()
      .where({ bookingId: booking.id })
      .whereIn('status', ['open', 'claimed'])
      .whereRaw('(user_id is null or user_id <> ?)', [organiser.id])
      .updateFrom({ userId: organiser.id, status: 'claimed' })
  }

  /** The shares `user` still has to pay on a booking, and what they come to. */
  static async due(booking: Booking, user: User): Promise<{ shares: BookingShare[]; amountMinor: number }> {
    const shares = (await BookingShare.query().where({ bookingId: booking.id, userId: user.id, status: 'claimed' }).limit(50).get()).all()

    return { shares, amountMinor: shares.reduce((sum, share) => sum + share.amountMinor, 0) }
  }

  /**
   * A payment for shares came through. Its shares are paid and the money goes into escrow;
   * once every share is paid, the booking is. A payment for shares that changed hands or
   * were paid by someone else meanwhile, or for a booking that lapsed, is sent back.
   */
  static async paid(booking: Booking, payment: Payment): Promise<void> {
    const ids = payment.shareIds ?? []
    const shares = ids.length ? (await BookingShare.query().whereIn('id', ids).get()).all() : []
    const valid =
      booking.status === Booking.HELD &&
      shares.length === ids.length &&
      shares.every((share) => share.bookingId === booking.id && share.userId === payment.userId && share.status === 'claimed')

    if (!valid) {
      await Shares.giveBack(booking, payment, 'Paid for a share that was no longer open', false)

      return
    }

    await BookingShare.query().whereIn('id', ids).updateFrom({ status: 'paid', paymentId: payment.id, paidAt: new Date() })
    await booking.record('escrow', 'payment_in', payment.amountMinor, payment.reference, 'A share, held until the artwork is up', payment.userId)

    const unpaid = await BookingShare.query().where({ bookingId: booking.id }).whereRaw("status <> 'paid'").exists()

    if (unpaid) return
    if (await booking.confirmPaid()) return

    await Shares.refundAll(booking, 'Paid after the hold ran out and the days were taken')
  }

  /** Send back every share paid on a shared booking that lapsed or was let go of. Runs on the schedule. */
  static async refundLapsed(): Promise<number> {
    await Booking.expireHolds()

    const lapsed = await Booking.query()
      .where({ shared: true })
      .whereIn('status', [Booking.EXPIRED, Booking.CANCELLED])
      .whereRaw("exists (select 1 from booking_shares where booking_shares.booking_id = bookings.id and booking_shares.status = 'paid')")
      .limit(50)
      .get()

    for (const booking of lapsed.all()) await Shares.refundAll(booking, 'The shared booking didn’t go ahead')

    return lapsed.all().length
  }

  /** Every paid share of a booking that didn't go ahead goes back to whoever paid it, in full. */
  static async refundAll(booking: Booking, reason: string): Promise<void> {
    const shares = (await BookingShare.query().where({ bookingId: booking.id, status: 'paid' }).limit(50).get()).all()
    const paymentIds = [...new Set(shares.map((share) => share.paymentId).filter((id): id is string => !!id))]

    await BookingShare.query().where({ bookingId: booking.id, status: 'paid' }).updateFrom({ status: 'refunded' })

    for (const id of paymentIds) {
      const payment = await Payment.query().find(id)

      if (payment) await Shares.giveBack(booking, payment, reason, true)
    }
  }

  /** Send one payment back to whoever made it, taking it out of escrow if it went in. */
  private static async giveBack(booking: Booking, payment: Payment, reason: string, inEscrow: boolean): Promise<void> {
    if (inEscrow) await booking.record('escrow', 'cancelled', -payment.amountMinor, payment.reference, reason, payment.userId)

    await booking.record('refund', 'payment_refund_due', payment.amountMinor, payment.reference, reason, payment.userId)
    await Refunds.forPayment(booking, payment, reason)
  }
}
