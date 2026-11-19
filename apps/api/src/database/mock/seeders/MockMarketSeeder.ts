import { Auction } from '@app/models/Auction'
import { Bid } from '@app/models/Bid'
import { Board } from '@app/models/Board'
import { BoardFace } from '@app/models/BoardFace'
import { Booking } from '@app/models/Booking'
import { Offer } from '@app/models/Offer'
import { AUCTIONS, OFFERS } from '../content/campaigns'
import { MockSeeder } from '../MockSeeder'

/** Offers below the list price in every state, an open auction with bids and one already sold. */
export class MockMarketSeeder extends MockSeeder {
  async run(): Promise<void> {
    await this.offers()
    await this.auctions()
  }

  private async offers(): Promise<void> {
    const rows = []

    for (const seed of OFFERS) {
      const { board, face, list } = await this.terms(seed.board, 1, seed.periods)
      const startsOn = this.data.day(seed.startsIn)
      const answered = seed.status !== 'pending'

      rows.push({
        id: this.data.id(),
        boardId: board.id,
        faceId: face.id,
        advertiserId: this.data.get('users', seed.advertiser).id,
        startsOn,
        endsOn: Booking.endOf(startsOn, seed.periods, board.ratePeriod),
        periods: seed.periods,
        ratePeriod: board.ratePeriod,
        currency: board.currency,
        listMinor: list,
        amountMinor: this.percentOf(list, seed.percent),
        counterMinor: seed.counterPercent ? this.percentOf(list, seed.counterPercent) : null,
        note: seed.note,
        status: seed.status,
        expiresAt: this.data.at(2),
        bookingId: this.data.find('bookings', seed.booking)?.id ?? null,
        respondedById: answered ? board.taggedById : null,
        respondedAt: answered ? this.data.at(-2) : null,
        ...this.data.stamps(-3),
      })
    }

    await this.data.insert(Offer, rows)
  }

  private async auctions(): Promise<void> {
    const auctions = []
    const bids = []

    for (const seed of AUCTIONS) {
      const { board, face, list } = await this.terms(seed.board, seed.face ?? 1, seed.periods)
      const startsOn = this.data.day(seed.startsIn)
      const id = this.data.id()
      const sold = seed.status === 'sold'
      let winningBidId: string | null = null

      for (const [index, [bidder, percent]] of seed.bids.entries()) {
        const top = index === seed.bids.length - 1
        const bidId = this.data.id()

        if (top && sold) winningBidId = bidId

        bids.push({
          id: bidId,
          auctionId: id,
          bidderId: this.data.get('users', bidder).id,
          amountMinor: this.percentOf(list, percent),
          status: sold ? (top ? 'won' : 'lost') : 'active',
          ...this.data.stamps(Math.min(seed.closesIn - 3, -2) + index * 0.5),
        })
      }

      auctions.push({
        id,
        boardId: board.id,
        faceId: face.id,
        startsOn,
        endsOn: Booking.endOf(startsOn, seed.periods, board.ratePeriod),
        periods: seed.periods,
        ratePeriod: board.ratePeriod,
        currency: board.currency,
        reserveMinor: list,
        format: seed.format,
        closesAt: this.data.at(seed.closesIn),
        status: seed.status,
        winningBidId,
        bookingId: this.data.find('bookings', seed.booking)?.id ?? null,
        openedById: board.taggedById,
        ...this.data.stamps(seed.closesIn - 7),
      })
    }

    await this.data.insert(Auction, auctions)
    await this.data.insert(Bid, bids)
  }

  private async terms(boardKey: string, position: number, periods: number): Promise<{ board: Board; face: BoardFace; list: number }> {
    const board = await Board.query().findOrFail(this.data.get('boards', boardKey).id)
    const face = await BoardFace.query().findOrFail(this.data.get('faces', `${boardKey}:${position}`).id)

    return { board, face, list: Number(board.rateFor(face)) * periods }
  }

  private percentOf(amountMinor: number, percent: number): number {
    return Math.round((amountMinor * percent) / 10_000) * 100
  }
}
