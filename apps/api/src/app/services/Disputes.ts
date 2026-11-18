import { abortIf } from '@arkstack/common'
import { Booking } from '@app/models/Booking'
import { Dispute, type DisputeDecision, type DisputeReason, type DisputeSide } from '@app/models/Dispute'
import type { User } from '@app/models/User'
import { MessageCollection } from '@app/http/resources/MessageCollection'
import { Day } from '@app/support/Day'
import { Money } from '@app/support/Money'
import { Settings } from '@app/support/Settings'
import { Messages } from './Messages'
import { Refunds } from './Refunds'

const REASONS: Record<DisputeReason, string> = {
  not_up: 'The ad isn’t up',
  wrong_ad: 'The wrong ad is up',
  damaged: 'The ad or board is damaged',
  taken_down: 'The ad came down early',
  payment: 'A problem with the money',
  other: 'Something else',
}

const DECISIONS: Record<DisputeDecision, string> = {
  refund_full: 'Cancelled and refunded in full',
  refund_part: 'Cancelled with part of the money back',
  release: 'The board’s side is paid',
  dismiss: 'Nothing changes',
}

/**
 * Disputes about a booking. Anyone on it raises one; staff decide it. While a paid
 * booking's dispute is open its money stays in escrow, and the decision either sends it
 * back, in full or in part, or pays the board's side. Each decision is recorded in the
 * booking's ledger and posted to its messages, so everyone on it sees the outcome.
 */
export class Disputes {
  static reasonLabel(reason: DisputeReason): string {
    return REASONS[reason]
  }

  static decisionLabel(decision: DisputeDecision): string {
    return DECISIONS[decision]
  }

  /** The booking's latest dispute, open or decided. */
  static latest(booking: Booking): Promise<Dispute | null> {
    return Dispute.query().where({ bookingId: booking.id }).latest('createdAt').first()
  }

  /** Which side `user` raises a dispute from, or null when they're not on the booking. Staff decide disputes rather than raise them. */
  static async sideOf(booking: Booking, user: User): Promise<DisputeSide | null> {
    const side = await MessageCollection.side(booking, user)

    return side === 'staff' ? null : side
  }

  /** Why the booking can't take a dispute now, or null when it can. */
  static async closedReason(booking: Booking): Promise<string | null> {
    if (!(await Settings.get('disputes.enabled'))) return 'Disputes are turned off. Message the others on the booking instead.'
    if (![Booking.PAID, Booking.LIVE, Booking.COMPLETED].includes(booking.status)) return 'Only a paid booking can be disputed.'
    if (await Dispute.isOpenOn(booking.id)) return 'This booking already has a dispute waiting for a decision.'

    const lastDay = Day.addDays(Day.of(booking.endsOn), await Settings.number('disputes.window_days'))

    return Day.today() > lastDay ? 'It’s too long since this booking ended to raise a dispute.' : null
  }

  static async open(booking: Booking, user: User, reason: DisputeReason, details: string): Promise<Dispute> {
    const side = await Disputes.sideOf(booking, user)
    const closed = await Disputes.closedReason(booking)

    abortIf(!side, 'Only the advertiser, whoever looks after the board and the billposter can raise a dispute.', 403)
    abortIf(!!closed, closed!, 422)
    abortIf(!details.trim(), 'Say what went wrong, so staff can look into it.', 422)

    const dispute = await Dispute.query()
      .create({ bookingId: booking.id, openedById: user.id, side: side!, reason, details: details.trim(), status: 'open' })
      .catch(() => null)

    abortIf(!dispute, 'This booking already has a dispute waiting for a decision.', 409)

    await Disputes.post(booking, user, `Raised a dispute: ${REASONS[reason]}. ${details.trim()}`)

    return dispute!
  }

  /**
   * Staff decide a dispute. Refunds and releases need the money still in escrow; the
   * booking's own guards stop two decisions moving it twice.
   */
  static async resolve(dispute: Dispute, staff: User, decision: DisputeDecision, resolution: string, refundMinor: number | null): Promise<Dispute> {
    const booking = await Booking.query().findOrFail(dispute.bookingId)
    const inEscrow = booking.status === Booking.PAID
    const note = resolution.trim()

    abortIf(dispute.status !== 'open', 'This dispute was already decided.', 409)
    abortIf(!note, 'Say why, so everyone on the booking understands the decision.', 422)
    abortIf(decision !== 'dismiss' && !inEscrow, 'The money has already left escrow, so this dispute can only be closed without a change.', 422)
    abortIf(decision === 'refund_part' && (!refundMinor || refundMinor <= 0 || refundMinor >= booking.amountMinor), 'Refund part of what was paid: more than nothing and less than all of it.', 422)

    const memo = `Dispute: ${note}`

    if (decision === 'refund_full') await Refunds.refundInFull(booking, staff, memo)
    if (decision === 'refund_part') await Refunds.partly(booking, staff, refundMinor!, memo)
    if (decision === 'release') abortIf(!(await booking.acceptProof(['none', 'submitted', 'disputed'])), 'This booking changed meanwhile. Refresh and decide again.', 409)

    const closed = await Dispute.query()
      .where({ id: dispute.id, status: 'open' })
      .updateFrom({ status: 'resolved', decision, resolution: note, refundMinor: decision === 'refund_part' ? refundMinor : decision === 'refund_full' ? booking.amountMinor : null, resolvedById: staff.id, resolvedAt: new Date() })

    abortIf(!closed, 'This dispute was already decided.', 409)

    const outcome = decision === 'refund_part' ? `${DECISIONS[decision]} (${Money.format(refundMinor!, booking.currency)})` : DECISIONS[decision]

    await booking.record('escrow', 'dispute_decided', 0, dispute.id, `${outcome}. ${memo}`)
    await Disputes.post(booking, staff, `Dispute decided: ${outcome}. ${note}`)

    return Dispute.query().findOrFail(dispute.id)
  }

  /** Post to the booking's messages, cut to fit the message limit. */
  private static async post(booking: Booking, author: User, text: string): Promise<void> {
    const max = await Settings.number('messages.max_length')

    await Messages.post(booking, author, text.length > max ? `${text.slice(0, max - 1)}…` : text, null)
  }
}
