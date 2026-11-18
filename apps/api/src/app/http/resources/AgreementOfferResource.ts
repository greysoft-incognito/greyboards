import { BoardPhoto } from '@app/models/BoardPhoto'
import type { BoardAgreement } from '@app/models/BoardAgreement'
import { Resource } from 'resora'
import { Sms } from '@app/support/Sms'

/** An agreement as its owner reads it from the link in their SMS: the board, who sent it and the terms. */
export class AgreementOfferResource extends Resource {
  async data() {
    const agreement = this.resource as BoardAgreement
    const board = (await agreement.board().first())!
    const sender = await agreement.sender().first()
    const cover = await BoardPhoto.query().where({ boardId: board.id }).oldest('createdAt').first()
    const rate = agreement.rate()

    return {
      status: agreement.displayStatus(),
      ownerName: agreement.ownerName,
      ownerPhone: Sms.mask(agreement.ownerPhone),
      ownerSharePercent: agreement.ownerSharePercent,
      wording: await agreement.wording(board, sender ?? null),
      rate: rate === null ? null : { amountMinor: rate, currency: agreement.currency, period: agreement.ratePeriod },
      expiresAt: agreement.expiresAt,
      signedName: agreement.signedName,
      signedAt: agreement.signedAt,
      scout: sender ? { name: sender.name, avatarUrl: await sender.avatarUrl() } : null,
      board: {
        name: board.name,
        kindLabel: board.kindLabel(),
        widthM: board.widthM,
        heightM: board.heightM,
        faces: board.faces,
        lit: board.lit,
        address: board.address,
        city: board.city,
        latitude: board.latitude,
        longitude: board.longitude,
        coverUrl: cover ? await cover.url() : null,
      },
    }
  }
}
