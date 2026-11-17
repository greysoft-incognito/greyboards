import type { Booking } from '@app/models/Booking'
import type { Board } from '@app/models/Board'
import { PrintJob } from '@app/models/PrintJob'
import { Day } from '@app/support/Day'
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

  private reviewer = false

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

  /** Add the artwork and the print job, for the booking's own page. `reviewer` looks after the board and checks the artwork. */
  withDetails(reviewer = false): this {
    this.detailed = true
    this.reviewer = reviewer

    return this
  }

  private async details(booking: Booking) {
    const job = await PrintJob.query().where({ bookingId: booking.id }).first()

    return {
      artwork: {
        status: booking.artworkStatus,
        url: await booking.artworkUrl(),
        width: booking.artworkWidth,
        height: booking.artworkHeight,
        note: booking.artworkNote,
        reviewedAt: booking.artworkReviewedAt,
        canReview: this.reviewer && booking.artworkStatus === 'submitted',
      },
      printJob: job ? { id: job.id, status: job.displayStatus(), dueOn: Day.of(job.dueOn), printPhotoUrl: await job.printPhotoUrl() } : null,
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
      cancelledAt: booking.cancelledAt,
      createdAt: booking.createdAt,
    }
  }
}
