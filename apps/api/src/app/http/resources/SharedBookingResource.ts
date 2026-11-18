import { Auction } from '@app/models/Auction'
import { Board } from '@app/models/Board'
import type { Booking } from '@app/models/Booking'
import { BookingShare } from '@app/models/BookingShare'
import { User } from '@app/models/User'
import { Shares } from '@app/services/Shares'
import { Resource } from 'resora'
import { AuctionResource } from './AuctionResource'
import { BoardResource } from './BoardResource'

/**
 * A shared booking anyone can find: the board, the days, what a share costs and how many are
 * left, and, once its lock ends, the bidding for the whole board.
 */
export class SharedBookingResource extends Resource {
  private viewer: User | null = null

  for(viewer: User): this {
    this.viewer = viewer

    return this
  }

  async data() {
    const booking = this.resource as Booking
    const board = await Board.query().find(booking.boardId)
    const shares = (await Shares.of(booking)).all()
    const open = shares.filter((share: BookingShare) => share.status === 'open')
    const organiser = await User.query().find(booking.advertiserId)
    const auction = await Auction.takeoverFor(booking)

    return {
      id: booking.id,
      board: board ? await new BoardResource(board).data() : null,
      startsOn: booking.days().startsOn,
      endsOn: booking.days().endsOn,
      currency: booking.currency,
      amountMinor: booking.amountMinor,
      count: shares.length,
      openCount: open.length,
      paidCount: shares.filter((share: BookingShare) => share.status === 'paid').length,
      shareAmountMinor: open.length ? Math.min(...open.map((share: BookingShare) => share.amountMinor)) : null,
      organiser: organiser?.name ?? null,
      payBy: booking.holdExpiresAt,
      lockedUntil: await Shares.lockedUntil(booking),
      takeoverOpen: await Shares.takeoverOpen(booking),
      bidsCloseAt: auction?.closesAt ?? (await Shares.takeoverClosesAt(booking)),
      auction: auction ? await new AuctionResource(auction).for(this.viewer).data() : null,
      joined: !!this.viewer && (booking.advertiserId === this.viewer.id || shares.some((share: BookingShare) => share.userId === this.viewer!.id)),
    }
  }
}
