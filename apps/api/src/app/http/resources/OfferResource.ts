import type { Board } from '@app/models/Board'
import type { Offer } from '@app/models/Offer'
import { User } from '@app/models/User'
import { Resource } from 'resora'
import { BoardResource } from './BoardResource'

/** An offer below the listed price, with what `viewer` can do with it now. */
export class OfferResource extends Resource {
  private viewer: User | null = null

  private board?: Board | null

  for(viewer: User): this {
    this.viewer = viewer

    return this
  }

  onBoard(board: Board | null): this {
    this.board = board

    return this
  }

  async data() {
    const offer = this.resource as Offer
    const viewer = this.viewer
    const face = await offer.face().first()
    const board = this.board === undefined ? await offer.board().first() : this.board
    const advertiser = await User.query().find(offer.advertiserId)
    const status = offer.displayStatus()
    const yourTurn = viewer ? await offer.awaits(viewer) : false
    const made = viewer?.id === offer.advertiserId

    return {
      id: offer.id,
      status,
      ...offer.days(),
      periods: offer.periods,
      ratePeriod: offer.ratePeriod,
      currency: offer.currency,
      listMinor: offer.listMinor,
      amountMinor: offer.amountMinor,
      counterMinor: offer.counterMinor,
      note: offer.note,
      expiresAt: offer.expiresAt,
      bookingId: offer.bookingId,
      face: face ? { id: face.id, label: face.label } : null,
      advertiser: advertiser ? { id: advertiser.id, name: advertiser.name } : null,
      board: board ? await new BoardResource(board).data() : null,
      can: {
        accept: yourTurn,
        decline: yourTurn,
        counter: yourTurn && status === 'pending',
        withdraw: made && (status === 'pending' || status === 'countered'),
      },
      respondedAt: offer.respondedAt,
      createdAt: offer.createdAt,
    }
  }
}
