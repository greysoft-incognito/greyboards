import { Board } from '@app/models/Board'
import { PrintJob } from '@app/models/PrintJob'
import type { PrintOffer } from '@app/models/PrintOffer'
import { User } from '@app/models/User'
import { Day } from '@app/support/Day'
import { Reputation } from '@app/services/Reputation'
import { PaymentRegions } from '@app/services/payments/PaymentRegions'
import { Resource } from 'resora'

/**
 * One dispatcher's price for a print job. `withJob` adds the board and date, for the
 * dispatcher's own list of prices and requests.
 */
export class PrintOfferResource extends Resource {
  private job = false

  withJob(): this {
    this.job = true

    return this
  }

  async data() {
    const offer = this.resource as PrintOffer
    const job = await PrintJob.query().find(offer.printJobId)
    const dispatcher = await User.query().find(offer.dispatcherId)
    const board = this.job && job ? await Board.query().find(job.boardId) : null
    const open = !!job && job.status === PrintJob.OPEN && !job.isPriced()

    return {
      id: offer.id,
      kind: offer.kind,
      status: open || !offer.isLive() ? offer.displayStatus() : 'closed',
      amountMinor: Number(offer.amountMinor),
      currency: job?.currency ?? (await PaymentRegions.defaultCurrency()),
      note: offer.note,
      expiresAt: offer.expiresAt,
      dispatcher: dispatcher ? { id: dispatcher.id, name: dispatcher.name, avatarUrl: await dispatcher.avatarUrl(), standing: await Reputation.standing(dispatcher.id, 'dispatch') } : null,
      job: board && job ? { id: job.id, boardName: board.name, city: board.city, widthM: Number(board.widthM), heightM: Number(board.heightM), dueOn: Day.of(job.dueOn) } : null,
      createdAt: offer.createdAt,
    }
  }
}
