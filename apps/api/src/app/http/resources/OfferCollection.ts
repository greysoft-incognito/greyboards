import type { Offer } from '@app/models/Offer'
import type { User } from '@app/models/User'
import { loadBoards } from './AuctionCollection'
import { Collection } from './Collection'
import { OfferResource } from './OfferResource'

/** A page of offers, their boards loaded in one query. */
export class OfferCollection extends Collection {
  collects = OfferResource

  private viewer: User | null = null

  for(viewer: User): this {
    this.viewer = viewer

    return this
  }

  data() {
    const offers = this.items() as Offer[]
    const boards = loadBoards(offers.map((offer) => offer.boardId))

    return offers.map(async (offer) => new OfferResource(offer).for(this.viewer!).onBoard((await boards).get(offer.boardId) ?? null).data()) as never
  }
}
