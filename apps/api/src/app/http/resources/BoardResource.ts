import type { Board } from '@app/models/Board'
import type { BoardPhoto } from '@app/models/BoardPhoto'
import { Reviews } from '@app/services/Reviews'
import { PriceGuide } from '@app/services/PriceGuide'
import { DigitalSlots } from '@app/services/DigitalSlots'
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
    const traffic = await PriceGuide.traffic(board.roadClass, board.dailyTraffic)

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
      headingDeg: board.headingDeg,
      lit: board.lit,
      address: board.address,
      city: board.city,
      country: board.country,
      latitude: board.latitude,
      longitude: board.longitude,
      currency: board.currency,
      rate: rate === null ? null : { amountMinor: rate, currency: board.currency, period: board.ratePeriod },
      printsOwn: !!board.printsOwn,
      roadClass: board.roadClass ?? null,
      /** About how many people pass each day, and whether someone counted them or it's from the kind of road. */
      traffic,
      /** What the rate costs for each 1,000 people passing. */
      costPerThousandMinor: PriceGuide.costPerThousand(rate, board.ratePeriod, traffic),
      /** On a digital screen: its loop. The rate is then for one slot, all day. */
      loop: board.isDigital() ? await DigitalSlots.loop(board) : null,
      status: board.status,
      distanceM: distance === undefined || distance === null ? null : Math.round(Number(distance)),
      coverUrl: cover ? await cover.url() : null,
      rating: await Reviews.summary(board.ratingSum ?? 0, board.ratingCount ?? 0),
      createdAt: board.createdAt,
    }
  }
}
