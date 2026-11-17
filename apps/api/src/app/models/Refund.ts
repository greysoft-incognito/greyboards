import { Model } from '@arkstack/database'

/** `processing` while the provider sends the money back, then `refunded`, or `failed` to try again. */
export type RefundStatus = 'processing' | 'refunded' | 'failed'

/** Money going back to an advertiser's card or account, for a cancelled booking. */
export class Refund extends Model {
  declare id: string
  declare bookingId: string
  declare paymentId: string
  declare amountMinor: number
  declare currency: string
  declare reason: string
  declare status: RefundStatus
  declare failureReason: string | null
  declare providerRefundId: string | null
  declare response: Record<string, unknown> | null
  declare requestedById: string | null
  declare refundedAt: Date | null
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'refunds'

  protected static override columns = {
    bookingId: 'booking_id',
    paymentId: 'payment_id',
    amountMinor: 'amount_minor',
    failureReason: 'failure_reason',
    providerRefundId: 'provider_refund_id',
    requestedById: 'requested_by_id',
    refundedAt: 'refunded_at',
  }

  protected override casts = {
    amountMinor: 'number',
    response: 'json',
    refundedAt: 'datetime',
  } as never
}
