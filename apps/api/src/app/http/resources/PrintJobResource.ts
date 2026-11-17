import type { PrintJob } from '@app/models/PrintJob'
import type { User } from '@app/models/User'
import { Day } from '@app/support/Day'
import { Resource } from 'resora'
import { BoardResource } from './BoardResource'
import { ProofSummary } from './ProofSummary'

/**
 * A print job as billposters see it: the board, its size, the pay and the date. The artwork
 * and the booking's days show only to the billposter who holds the job.
 */
export class PrintJobResource extends Resource {
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
      feeMinor: job.feeMinor,
      currency: job.currency,
      dueOn: Day.of(job.dueOn),
      reservedUntil: held ? job.reservedUntil : null,
      mine: held,
      distanceM: distance === undefined || distance === null ? null : Math.round(Number(distance)),
      board: board ? await new BoardResource(board).data() : null,
      artworkUrl: booking ? await booking.artworkUrl() : null,
      bookedDays: booking ? booking.days() : null,
      printPhotoUrl: held ? await job.printPhotoUrl() : null,
      /** The booking and its proof of posting, which the billposter photographs once the ad is up. */
      bookingId: booking ? booking.id : null,
      proof: booking ? await new ProofSummary(booking).for(this.viewer!).data() : null,
      createdAt: job.createdAt,
    }
  }
}
