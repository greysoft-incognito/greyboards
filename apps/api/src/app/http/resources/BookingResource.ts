import type { Booking } from '@app/models/Booking'
import type { Board } from '@app/models/Board'
import { PrintJob } from '@app/models/PrintJob'
import { User } from '@app/models/User'
import { BookingPolicy } from '@app/policies/BookingPolicy'
import { ProofSummary } from './ProofSummary'
import { Day } from '@app/support/Day'
import { Refund } from '@app/models/Refund'
import { Refunds } from '@app/services/Refunds'
import { Messages } from '@app/services/Messages'
import { Shares } from '@app/services/Shares'
import { Resource } from 'resora'
import { BoardResource } from './BoardResource'

/**
 * A booking, with its board. The advertiser sees what they pay; whoever looks after the
 * board also sees how the money is split once it's paid.
 */
export class BookingResource extends Resource {
  private board?: Board | null

  private showSplit = false

  private detailed = false

  private viewer: User | null = null

  /** The booked board, when the caller already loaded it. */
  onBoard(board: Board | null): this {
    this.board = board

    return this
  }

  /** Show the owner's and scout's amounts, for whoever looks after the board and staff. */
  withSplit(show: boolean): this {
    this.showSplit = show

    return this
  }

  /** Add the artwork, the print job and the proof, with what `viewer` can do to each, for the booking's own page. */
  withDetails(viewer: User): this {
    this.detailed = true
    this.viewer = viewer

    return this
  }

  private async details(booking: Booking) {
    const viewer = this.viewer!
    const job = await PrintJob.query().where({ bookingId: booking.id }).first()
    const manages = await BookingPolicy.managesBoard(viewer, booking)

    return {
      artwork: {
        status: booking.artworkStatus,
        url: await booking.artworkUrl(),
        width: booking.artworkWidth,
        height: booking.artworkHeight,
        note: booking.artworkNote,
        reviewedAt: booking.artworkReviewedAt,
        canReview: manages && booking.artworkStatus === 'submitted',
      },
      printJob: job ? { id: job.id, status: job.displayStatus(), dueOn: Day.of(job.dueOn), printPhotoUrl: await job.printPhotoUrl() } : null,
      proof: await new ProofSummary(booking).for(viewer).data(),
      cancellation: BookingPolicy.owns(viewer, booking) && booking.status === 'paid' ? await Refunds.quote(booking) : null,
      shares: booking.shared ? await BookingResource.shares(booking, viewer) : null,
      messages: await Messages.counts(booking, viewer),
      refunds: (await Refund.query().where({ bookingId: booking.id }).oldest('createdAt').limit(10).get()).all().map((refund) => ({
        amountMinor: Number(refund.amountMinor),
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason,
        refundedAt: refund.refundedAt,
        createdAt: refund.createdAt,
      })),
    }
  }

  /**
   * Each share of a shared booking, who holds it and whether it's paid. The organiser sees
   * the invite link of each open share; nobody else sees links.
   */
  private static async shares(booking: Booking, viewer: User) {
    const shares = (await Shares.of(booking)).all()
    const holders = await User.query().whereIn('id', shares.map((share) => share.userId).filter((id): id is string => !!id)).get()
    const names = new Map(holders.all().map((holder) => [holder.id, holder.name]))
    const organiser = viewer.id === booking.advertiserId
    const base = String(config('app.frontend_url')).replace(/\/+$/, '')

    return Promise.all(shares.map(async (share) => ({
      id: share.id,
      position: share.position,
      amountMinor: share.amountMinor,
      status: share.status,
      holder: share.userId ? (names.get(share.userId) ?? null) : null,
      mine: share.userId === viewer.id,
      inviteUrl: organiser && share.status === 'open' ? `${base}/shares/${share.token}` : null,
      paidAt: share.paidAt,
      designUrl: await share.designUrl(),
      designSentAt: share.designSentAt,
    })))
  }

  async data() {
    const booking = this.resource as Booking
    const board = this.board === undefined ? await booking.board().first() : this.board
    const { startsOn, endsOn } = booking.days()
    const face = booking.faceId ? await booking.face().first() : null

    return {
      id: booking.id,
      status: booking.displayStatus(),
      startsOn,
      endsOn,
      periods: booking.periods,
      face: face ? { id: face.id, label: face.label } : null,
      rate: { amountMinor: booking.rateMinor, currency: booking.currency, period: booking.ratePeriod },
      amountMinor: booking.amountMinor,
      printFeeMinor: booking.printFeeMinor,
      printedBy: booking.printedBy,
      source: booking.source ?? 'book',
      shared: !!booking.shared,
      currency: booking.currency,
      holdSecondsLeft: booking.secondsLeft(),
      advertiserId: booking.advertiserId,
      split:
        this.showSplit && booking.ownerAmountMinor !== null
          ? {
              ownerSharePercent: booking.ownerSharePercent,
              ownerAmountMinor: booking.ownerAmountMinor,
              scoutAmountMinor: booking.scoutAmountMinor,
              platformAmountMinor: booking.platformAmountMinor,
            }
          : null,
      board: board ? await new BoardResource(board).data() : null,
      ...(this.detailed ? await this.details(booking) : {}),
      paidAt: booking.paidAt,
      releasedAt: booking.releasedAt,
      cancelledAt: booking.cancelledAt,
      createdAt: booking.createdAt,
    }
  }
}
