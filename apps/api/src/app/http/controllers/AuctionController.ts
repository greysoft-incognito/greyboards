import { Auction } from '@app/models/Auction'
import { Board } from '@app/models/Board'
import { BoardPolicy } from '@app/policies/BoardPolicy'
import { AuctionCollection } from '@app/http/resources/AuctionCollection'
import { AuctionResource } from '@app/http/resources/AuctionResource'
import { Day } from '@app/support/Day'
import { UUID } from '@app/support/rules'
import { BaseController } from './BaseController'
import { RequestException, perPage } from '@arkstack/common'

/** Owners and scouts open a face's dates to bids; advertisers bid for them. */
export default class AuctionController extends BaseController {
  /** A board's auctions: the running ones for everyone, recent ones too for whoever looks after it. */
  async index() {
    const board = await Board.query().findOrFail(String(this.params.board))
    const viewer = await this.viewer()

    if (!(await BoardPolicy.view(viewer, board))) throw new RequestException('Board not found.', 404)

    const manages = !!viewer && (await BoardPolicy.manages(viewer, board))
    const query = Auction.query().where({ boardId: board.id })

    if (!manages) query.whereIn('status', Auction.TAKING)

    const auctions = await query.latest('createdAt').limit(manages ? 40 : Auction.MAX_OPEN_PER_BOARD).get()

    return new AuctionCollection(auctions).for(viewer).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async show() {
    const auction = await Auction.query().findOrFail(String(this.params.auction))
    const board = await auction.board().firstOrFail()
    const viewer = await this.viewer()

    if (!(await BoardPolicy.view(viewer, board))) throw new RequestException('Auction not found.', 404)

    return new AuctionResource(auction).for(viewer).onBoard(board).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** Whoever looks after the board opens a face's dates to bids. */
  async create() {
    const board = await Board.query().findOrFail(String(this.params.board))

    if (!(await BoardPolicy.manages(this.user, board))) throw new RequestException('Board not found.', 404)

    const data = await this.validate({
      faceId: ['nullable', UUID],
      startsOn: 'required|date',
      periods: 'required|integer|min:1|max:52',
      reserveMinor: 'required|integer|min:1',
      closesAt: 'required|date',
    })

    const face = await board.faceFor(data.faceId ? String(data.faceId) : null)
    const auction = await Auction.open(board, face, this.user, {
      startsOn: Day.of(String(data.startsOn)),
      periods: Number(data.periods),
      reserveMinor: Number(data.reserveMinor),
      closesAt: new Date(String(data.closesAt)),
    })

    return new AuctionResource(auction).for(this.user).additional({ status: 'success', message: 'Open for bids.', code: 201 }).response().setStatusCode(201)
  }

  /** Place or raise a bid. */
  async bid() {
    const auction = await this.auction()
    const data = await this.validate({ amountMinor: 'required|integer|min:1' })

    await auction.placeBid(this.user, Number(data.amountMinor))

    const fresh = await Auction.query().findOrFail(auction.id)

    return new AuctionResource(fresh).for(this.user).additional({ status: 'success', message: 'Bid placed.', code: 200 })
  }

  /** Close an auction nobody bid on yet. */
  async cancel() {
    const auction = await this.auction()

    if (!(await BoardPolicy.manages(this.user, await auction.board().firstOrFail()))) throw new RequestException('Only whoever looks after the board can close bidding.', 403)

    await auction.cancel()

    return new AuctionResource(auction).for(this.user).additional({ status: 'success', message: 'Bidding closed. The dates are free to book again.', code: 200 })
  }

  /** Auctions the account bid on, latest first. */
  async mine() {
    const auctions = await Auction.query()
      .whereRaw('id in (select auction_id from bids where bidder_id = ?)', [this.user.id])
      .latest('closesAt')
      .paginate(perPage(this.query, { perPage: 20, maxPerPage: 50 }))

    return new AuctionCollection(auctions).for(this.user).withBoards().additional({ status: 'success', message: 'OK', code: 200 })
  }

  private async auction(): Promise<Auction> {
    const auction = await Auction.query().find(String(this.params.auction))

    if (!auction) throw new RequestException('Auction not found.', 404)

    return auction
  }
}
