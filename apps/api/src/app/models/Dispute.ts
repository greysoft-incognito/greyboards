import { Model } from '@arkstack/database'

/** What went wrong, as whoever raised the dispute put it. */
export type DisputeReason = 'not_up' | 'wrong_ad' | 'damaged' | 'taken_down' | 'payment' | 'other'

/** Which side of the booking raised it. */
export type DisputeSide = 'advertiser' | 'board' | 'dispatch'

/**
 * What staff decided. `refund_full` and `refund_part` cancel the booking and send money
 * back from escrow, `release` pays the board's side, `dismiss` changes nothing.
 */
export type DisputeDecision = 'refund_full' | 'refund_part' | 'release' | 'dismiss'

/** A problem with a booking for staff to decide. One open at a time per booking. */
export class Dispute extends Model {
  static readonly REASONS: DisputeReason[] = ['not_up', 'wrong_ad', 'damaged', 'taken_down', 'payment', 'other']

  static readonly DECISIONS: DisputeDecision[] = ['refund_full', 'refund_part', 'release', 'dismiss']

  declare id: string
  declare bookingId: string
  declare openedById: string
  declare side: DisputeSide
  declare reason: DisputeReason
  declare details: string
  declare status: 'open' | 'resolved'
  declare decision: DisputeDecision | null
  declare refundMinor: number | null
  declare resolution: string | null
  declare resolvedById: string | null
  declare resolvedAt: Date | null
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'disputes'

  protected static override columns = {
    bookingId: 'booking_id',
    openedById: 'opened_by_id',
    refundMinor: 'refund_minor',
    resolvedById: 'resolved_by_id',
    resolvedAt: 'resolved_at',
  }

  protected override casts = {
    refundMinor: 'number',
  } as never

  /** Whether a booking has a dispute waiting for staff. */
  static isOpenOn(bookingId: string): Promise<boolean> {
    return Dispute.query().where({ bookingId, status: 'open' }).exists()
  }
}
