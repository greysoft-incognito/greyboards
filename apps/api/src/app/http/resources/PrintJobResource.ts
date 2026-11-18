import type { PrintJob } from '@app/models/PrintJob'
import { PrintOffer } from '@app/models/PrintOffer'
import type { User } from '@app/models/User'
import { Day } from '@app/support/Day'
import { Settings } from '@app/support/Settings'
import { Messages } from '@app/services/Messages'
import { Resource } from 'resora'
import { BoardResource } from './BoardResource'
import { PrintOfferResource } from './PrintOfferResource'
import { ProofSummary } from './ProofSummary'

/**
 * A print job as dispatchers see it: the board, its size, the pay and the date. The artwork
 * and the booking's days show only to the dispatcher who holds the job.
 */
export class PrintJobResource extends Resource {
  static async offerOf(job: PrintJob, viewer: User) {
    const offer = await PrintOffer.query().where({ printJobId: job.id, dispatcherId: viewer.id }).whereIn('status', PrintOffer.LIVE).latest('updatedAt').first()

    return offer ? new PrintOfferResource(offer).data() : null
  }

  private viewer: User | null = null

  for(viewer: User): this {
    this.viewer = viewer

    return this
  }

  async data() {
    const job = this.resource as PrintJob
    const board = await job.board().first()
    const held = !!this.viewer && job.isHeldBy(this.viewer)
    const booking = held ? await job.booking().first() : null
    const distance = (job as any).distance_m ?? job.distanceM

    return {
      id: job.id,
      status: job.displayStatus(),
      /** Whether the advertiser paid a price. Open jobs without one take prices from dispatchers. */
      priced: job.isPriced(),
      feeMinor: job.payMinor(),
      bonusMinor: Number(job.bonusMinor ?? 0),
      currency: job.currency,
      dueOn: Day.of(job.dueOn),
      printBy: Day.addDays(Day.of(job.dueOn), -(await Settings.number('printing.print_by_days'))),
      reservedUntil: held ? job.reservedUntil : null,
      mine: held,
      distanceM: distance === undefined || distance === null ? null : Math.round(Number(distance)),
      board: board ? await new BoardResource(board).data() : null,
      artworkUrl: booking ? await booking.artworkUrl() : null,
      bookedDays: booking ? booking.days() : null,
      printPhotoUrl: held ? await job.printPhotoUrl() : null,
      /** The booking and its proof of posting, which the dispatcher photographs once the ad is up. */
      bookingId: booking ? booking.id : null,
      proof: booking ? await new ProofSummary(booking).for(this.viewer!).data() : null,
      /** Messages about the booking, for the dispatcher holding the job. */
      messages: booking ? await Messages.counts(booking, this.viewer!) : null,
      /** The viewing dispatcher's own price or request on this job, while it is open. */
      myOffer: this.viewer && !job.isPriced() ? await PrintJobResource.offerOf(job, this.viewer) : null,
      createdAt: job.createdAt,
    }
  }
}
