import { abortIf } from '@arkstack/common'
import { randomBytes } from 'node:crypto'
import { Auction } from '@app/models/Auction'
import { Booking } from '@app/models/Booking'
import { BookingShare } from '@app/models/BookingShare'
import { Bid } from '@app/models/Bid'
import { Payment } from '@app/models/Payment'
import type { UploadedFile, User } from '@app/models/User'
import { Board } from '@app/models/Board'
import { MergedArtwork } from '@app/support/MergedArtwork'
import { Settings } from '@app/support/Settings'
import { StoredImage } from '@app/support/StoredImage'
import { Refunds } from './Refunds'

/**
 * Shared (co-op) bookings: several advertisers pay for one board over the same days, and the
 * print merges each one's design. The organiser holds the dates for everyone and invites the
 * others by link; each pays their own share into escrow and sends their own design. The
 * booking is paid once every share is, and the organiser may cover shares nobody paid. If the
 * hold runs out first, everyone who paid gets their money back.
 *
 * Shared bookings with shares left are listed for anyone to find and join. They stay locked
 * for the sharers for `shares.lock_hours`; after that, while shares are unpaid, the whole
 * board goes up for bids, starting at the full price. Bidding closes `shares.takeover_pay_hours`
 * before the shared booking's hold runs out, and the winner has until then to pay. If they do,
 * the board is theirs and the sharers get their money back; if the sharers pay every share
 * first, the board stays theirs and bidding ends.
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

    abortIf(!share || !booking, 'This invite link doesn’t work.', 404)

    return { share: share!, booking: booking! }
  }

  /** Whether `user` holds a share of the booking. */
  static holds(user: User, booking: Booking): Promise<boolean> {
    return BookingShare.query().where({ bookingId: booking.id, userId: user.id }).exists()
  }

  /** When the booking stops being locked for the people sharing it. */
  static async lockedUntil(booking: Booking): Promise<Date> {
    return new Date(new Date(booking.createdAt).getTime() + (await Settings.number('shares.lock_hours')) * 3_600_000)
  }

  /** When bidding for the whole board closes: early enough for the winner to pay before the hold runs out. */
  static async takeoverClosesAt(booking: Booking): Promise<Date> {
    const holdEnds = booking.holdExpiresAt ? new Date(booking.holdExpiresAt).getTime() : Date.now()

    return new Date(holdEnds - (await Settings.number('shares.takeover_pay_hours')) * 3_600_000)
  }

  /**
   * Whether anyone can bid for the whole board now: its lock ended, shares are still unpaid,
   * and bidding is running or there's time left to open it.
   */
  static async takeoverOpen(booking: Booking): Promise<boolean> {
    if (!booking.shared || !booking.isHeld() || !(await Settings.get('shares.takeover'))) return false
    if ((await Shares.lockedUntil(booking)).getTime() > Date.now()) return false
    if (!(await BookingShare.query().where({ bookingId: booking.id }).whereRaw("status <> 'paid'").exists())) return false

    const running = await Auction.takeoverFor(booking)

    if (running) return running.isOpen()

    return (await Shares.takeoverClosesAt(booking)).getTime() > Date.now() + Auction.MIN_OPEN_HOURS * 3_600_000
  }

  /** Bid for the whole board, opening the bidding if this is the first bid. Those sharing it can't. */
  static async bidToTake(booking: Booking, user: User, amountMinor: number): Promise<Auction> {
    abortIf(!(await Shares.takeoverOpen(booking)), 'This shared board isn’t open to bids right now.', 422)
    abortIf(booking.advertiserId === user.id || (await Shares.holds(user, booking)), 'You’re already sharing this board. Pay the remaining shares to keep it.', 422)

    const auction = await Auction.openTakeover(booking, await Shares.takeoverClosesAt(booking))

    await auction.placeBid(user, amountMinor)

    return Auction.query().findOrFail(auction.id)
  }

  /**
   * Shared bookings anyone can join, soonest to lapse first: held, with a share nobody took.
   * Narrowed to one board, or to boards within `radiusKm` of a point.
   */
  static async discoverable(filter: { boardId?: string; near?: { latitude: number; longitude: number; radiusKm: number } } = {}) {
    abortIf(!(await Settings.get('shares.discoverable')), 'Shared boards aren’t available right now.', 404)

    let query = Booking.query()
      .where({ shared: true, status: Booking.HELD })
      .whereRaw('hold_expires_at > now()')
      .whereRaw(
        "(exists (select 1 from booking_shares where booking_shares.booking_id = bookings.id and booking_shares.status = 'open') or exists (select 1 from auctions where auctions.shared_booking_id = bookings.id and auctions.status in ('open', 'awarded')))",
      )

    if (filter.boardId) query = query.where({ boardId: filter.boardId })

    if (filter.near) {
      const { latitude, longitude, radiusKm } = filter.near

      query = query.whereRaw('board_id in (select id from boards where ST_DWithin(location, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?))', [longitude, latitude, radiusKm * 1000])
    }

    return query.oldest('holdExpiresAt').limit(50).get()
  }

  /** Join a listed shared booking: take its first open share, to pay it. */
  static async join(booking: Booking, user: User): Promise<void> {
    abortIf(!booking.shared, 'This booking isn’t shared.', 404)
    abortIf(!(await Settings.get('shares.discoverable')), 'Use the invite link to join this booking.', 403)

    const share = await BookingShare.query().where({ bookingId: booking.id, status: 'open' }).oldest('position').first()

    abortIf(!share, 'All the shares are taken.', 409)

    await Shares.claim(share!, booking, user)
  }

  /**
   * The winning bidder paid for the whole board. The booking becomes theirs alone, at their
   * bid: everyone who paid a share gets their money back, and the payment goes into escrow.
   * If the sharers paid every share first, or the winner's time ran out, it goes back instead.
   */
  static async takeOver(booking: Booking, payment: Payment): Promise<void> {
    const auction = await Auction.takeoverFor(booking)
    const winner = auction?.status === 'awarded' && auction.winningBidId ? await Bid.query().find(auction.winningBidId) : null
    const valid =
      booking.shared &&
      booking.isHeld() &&
      !!winner &&
      winner.bidderId === payment.userId &&
      payment.amountMinor >= winner.amountMinor &&
      (await BookingShare.query().where({ bookingId: booking.id }).whereRaw("status <> 'paid'").exists())

    if (!valid) {
      await Shares.giveBack(booking, payment, 'Paid to take a shared board that was no longer theirs to take', false)

      return
    }

    await Shares.refundAll(booking, 'Someone won the whole board after the shared booking’s lock ended')
    await BookingShare.query().where({ bookingId: booking.id }).whereIn('status', ['open', 'claimed']).updateFrom({ status: 'refunded' })
    await booking.update({
      advertiserId: payment.userId,
      shared: false,
      amountMinor: payment.amountMinor,
      rateMinor: Math.round((payment.amountMinor - booking.printFeeMinor) / booking.periods),
      source: 'bid',
    })
    await booking.record('escrow', 'payment_in', payment.amountMinor, payment.reference, 'The whole board, won by bid, held until the artwork is up', payment.userId)

    if (await booking.confirmPaid()) {
      await auction!.markSold()

      return
    }

    await Shares.giveBack(booking, payment, 'Paid after the hold ran out and the days were taken', true)
  }

  /** What the winner of a shared board's bidding owes, and by when. */
  static async takeoverDue(booking: Booking, user: User): Promise<{ amountMinor: number; payBy: Date }> {
    const auction = await Auction.takeoverFor(booking)
    const winner = auction?.status === 'awarded' && auction.winningBidId ? await Bid.query().find(auction.winningBidId) : null

    abortIf(!winner || winner.bidderId !== user.id, 'Only the winning bidder can pay for this board.', 403)
    abortIf(!auction!.payBy || auction!.payBy.getTime() <= Date.now() || !booking.isHeld(), 'Your time to pay has run out.', 422)

    return { amountMinor: winner!.amountMinor, payBy: auction!.payBy! }
  }

  /** Take an open share from its invite link. One share per advertiser per booking. */
  static async claim(share: BookingShare, booking: Booking, user: User): Promise<void> {
    abortIf(!booking.isHeld(), 'This booking is already closed.', 422)
    abortIf(share.userId === user.id, 'This share is already yours.', 422)
    abortIf(share.status !== 'open', 'Someone already took this share.', 409)
    abortIf(await Shares.holds(user, booking), 'You already have a share of this booking.', 422)

    const claimed = await BookingShare.query().where({ id: share.id, status: 'open' }).updateFrom({ userId: user.id, status: 'claimed' })

    abortIf(!claimed, 'Someone already took this share.', 409)
  }

  /** The organiser takes every share nobody paid yet, so they can pay the rest themselves. */
  static async cover(booking: Booking, organiser: User): Promise<number> {
    abortIf(!booking.shared || booking.advertiserId !== organiser.id, 'Only the person who started this booking can pay the remaining shares.', 403)
    abortIf(!booking.isHeld(), 'This booking is already closed.', 422)

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
    if (await booking.confirmPaid()) return Auction.endTakeover(booking)

    await Shares.refundAll(booking, 'Paid after the hold ran out and the days were taken')
  }

  /**
   * Someone who paid a share sends their design. Once everyone who paid has, the designs are
   * merged into the booking's print artwork for whoever looks after the board to check. A new
   * design before approval merges them again.
   */
  static async sendDesign(booking: Booking, share: BookingShare, user: User, file: UploadedFile): Promise<boolean> {
    abortIf(!booking.shared || share.bookingId !== booking.id, 'That share isn’t part of this booking.', 404)
    abortIf(share.userId !== user.id, 'Only the person who paid for this share can upload its design.', 403)
    abortIf(booking.status !== Booking.PAID || share.status !== 'paid', 'You can upload your design once the booking is paid.', 422)
    abortIf(booking.artworkStatus === 'approved', 'The design is already approved and being printed.', 422)

    const saved = await StoredImage.save(`bookings/${booking.id}/designs`, file)

    await StoredImage.remove(share.designDisk, share.designPath)
    await share.update({ designPath: saved.path, designDisk: saved.disk, designWidth: saved.width, designHeight: saved.height, designSentAt: new Date() })

    return Shares.mergeIfReady(booking)
  }

  /** Merge the designs into the print once every paid share has one. Returns whether it did. */
  static async mergeIfReady(booking: Booking): Promise<boolean> {
    const shares = (await BookingShare.query().where({ bookingId: booking.id, status: 'paid' }).oldest('position').limit(50).get()).all()

    if (!shares.length || shares.some((share) => !share.designPath || !share.designDisk)) return false

    const board = await Board.query().findOrFail(booking.boardId)
    const layout = (await Settings.get('shares.merge_layout')) === 'rows' ? 'rows' : 'columns'
    const merged = await MergedArtwork.make(
      `bookings/${booking.id}/artwork`,
      shares.map((share) => ({ disk: share.designDisk!, path: share.designPath! })),
      Number(board.widthM) / Number(board.heightM),
      layout,
    )

    await booking.useArtwork(merged)

    return true
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
