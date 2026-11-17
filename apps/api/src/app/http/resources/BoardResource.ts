import type { Board } from '@app/models/Board'
import type { BoardPhoto } from '@app/models/BoardPhoto'
import { Resource } from 'resora'

/** A board as anyone may see it. The owner's contact and review notes stay private. */
export class BoardResource extends Resource {
  /** The board's first photo, when the caller already loaded it. Undefined loads it here. */
  cover?: BoardPhoto | null

  withCover(cover: BoardPhoto | null): this {
    this.cover = cover

    return this
  }

  async data() {
    const board = this.resource as Board
    const cover = this.cover === undefined ? await board.photos().oldest('createdAt').first() : this.cover
    const rate = board.rate()
    const distance = (board as any).distance_m ?? board.distanceM

    return {
      id: board.id,
      name: board.name,
      description: board.description,
      kind: board.kind,
      kindLabel: board.kindLabel(),
      widthM: board.widthM,
      heightM: board.heightM,
      faces: board.faces,
      facing: board.facing,
      lit: board.lit,
      address: board.address,
      city: board.city,
      country: board.country,
      latitude: board.latitude,
      longitude: board.longitude,
      rate: rate === null ? null : { amountMinor: rate, currency: board.currency, period: board.ratePeriod },
      status: board.status,
      distanceM: distance === undefined || distance === null ? null : Math.round(Number(distance)),
      coverUrl: cover ? await cover.url() : null,
      createdAt: board.createdAt,
    }
  }
}
