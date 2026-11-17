import type { Booking } from '@app/models/Booking'
import type { Board } from '@app/models/Board'
import { PrintJob } from '@app/models/PrintJob'
import type { User } from '@app/models/User'
import { BookingPolicy } from '@app/policies/BookingPolicy'
import { ProofSummary } from './ProofSummary'
import { Day } from '@app/support/Day'
import { Refund } from '@app/models/Refund'
import { Refunds } from '@app/services/Refunds'
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

  async data() {
    const booking = this.resource as Booking
    const board = this.board === undefined ? await booking.board().first() : this.board
    const { startsOn, endsOn } = booking.days()

    return {
      id: booking.id,
      status: booking.displayStatus(),
      startsOn,
      endsOn,
      periods: booking.periods,
      rate: { amountMinor: booking.rateMinor, currency: booking.currency, period: booking.ratePeriod },
      amountMinor: booking.amountMinor,
      printFeeMinor: booking.printFeeMinor,
      printedBy: booking.printedBy,
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
