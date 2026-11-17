import type { Booking } from '@app/models/Booking'
import type { Board } from '@app/models/Board'
import { Resource } from 'resora'
import { BoardResource } from './BoardResource'

/**
 * A booking, with its board. The advertiser sees what they pay; whoever looks after the
 * board also sees how the money is split once it's paid.
 */
export class BookingResource extends Resource {
  private board?: Board | null

  private showSplit = false

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
      paidAt: booking.paidAt,
      cancelledAt: booking.cancelledAt,
      createdAt: booking.createdAt,
    }
  }
}
