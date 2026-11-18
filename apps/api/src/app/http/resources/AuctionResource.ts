import type { Auction } from '@app/models/Auction'
import { Bid } from '@app/models/Bid'
import type { Board } from '@app/models/Board'
import type { User } from '@app/models/User'
import { Resource } from 'resora'
import { BoardResource } from './BoardResource'

/**
 * Dates open for bids. Everyone sees the reserve, the close and how many bid; the highest
 * amount shows on open auctions, and on sealed ones after the close. A signed-in viewer
 * sees their own bid and, when they won, the booking to pay for.
 */
export class AuctionResource extends Resource {
  private viewer: User | null = null

  private board?: Board | null

  for(viewer: User | null): this {
    this.viewer = viewer

    return this
  }

  /** Include the board, when the caller loaded it. */
  onBoard(board: Board | null): this {
    this.board = board

    return this
  }

  async data() {
    const auction = this.resource as Auction
    const face = await auction.face().first()
    const top = await auction.highest()
    const winner = auction.winningBidId ? await Bid.query().find(auction.winningBidId) : null
    const shown = auction.showsAmounts()
    const mine = this.viewer ? await Bid.query().where({ auctionId: auction.id, bidderId: this.viewer.id }).first() : null

    return {
      id: auction.id,
      status: auction.status,
      open: auction.isOpen(),
      format: auction.format,
      ...auction.days(),
      periods: auction.periods,
      ratePeriod: auction.ratePeriod,
      currency: auction.currency,
      reserveMinor: auction.reserveMinor,
      closesAt: auction.closesAt,
      bidCount: await Bid.query().where({ auctionId: auction.id }).count(),
      highestMinor: shown ? (winner?.amountMinor ?? top?.amountMinor ?? null) : null,
      nextMinimumMinor: auction.isOpen() ? await auction.nextMinimum() : null,
      face: face ? { id: face.id, label: face.label } : null,
      takeoverOf: auction.sharedBookingId,
      payBy: auction.status === 'awarded' ? auction.payBy : null,
      myBid: mine
        ? {
            amountMinor: mine.amountMinor,
            status: mine.status,
            leading: shown && mine.status === 'active' && top?.id === mine.id,
            bookingId: mine.id === auction.winningBidId && !auction.isTakeover() ? auction.bookingId : null,
          }
        : null,
      board: this.board ? await new BoardResource(this.board).data() : undefined,
      createdAt: auction.createdAt,
    }
  }
}
