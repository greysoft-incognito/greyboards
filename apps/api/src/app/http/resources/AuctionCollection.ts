import { Board } from '@app/models/Board'
import type { Auction } from '@app/models/Auction'
import type { User } from '@app/models/User'
import { AuctionResource } from './AuctionResource'
import { Collection } from './Collection'

/** A page of auctions. With `withBoards`, their boards load in one query. */
export class AuctionCollection extends Collection {
  collects = AuctionResource

  private viewer: User | null = null

  private boards = false

  for(viewer: User | null): this {
    this.viewer = viewer

    return this
  }

  withBoards(): this {
    this.boards = true

    return this
  }

  data() {
    const auctions = this.items() as Auction[]
    const boards = this.boards ? loadBoards(auctions.map((auction) => auction.boardId)) : Promise.resolve(null)

    return auctions.map(async (auction) => {
      const resource = new AuctionResource(auction).for(this.viewer)
      const loaded = await boards

      return (loaded ? resource.onBoard(loaded.get(auction.boardId) ?? null) : resource).data()
    }) as never
  }
}

/** Boards by id, in one query. */
export async function loadBoards(ids: string[]): Promise<Map<string, Board>> {
  const unique = [...new Set(ids)]
  const boards = unique.length ? (await Board.query().whereIn('id', unique).get()).all() : []

  return new Map(boards.map((board) => [board.id, board]))
}
