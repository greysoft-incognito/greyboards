import type { Board } from '@app/models/Board'
import { Commissions } from '@app/services/Commissions'
import { AvailabilityBlock } from '@app/models/AvailabilityBlock'
import { Day } from '@app/support/Day'
import { PrintJob } from '@app/models/PrintJob'
import { Settings } from '@app/support/Settings'
import { BoardAgreementResource } from './BoardAgreementResource'
import { BoardPhotoResource } from './BoardPhotoResource'
import { OwnerProfileResource } from './OwnerProfileResource'
import { BoardResource } from './BoardResource'

/** A board with its photos and, for its owner, tagger and reviewers, the private details. */
export class ManagedBoardResource extends BoardResource {
  private showPrivate = true

  /** Leave out the private details, for anyone who doesn't look after the board. */
  withPrivate(show: boolean): this {
    this.showPrivate = show

    return this
  }

  async data() {
    const board = this.resource as Board
    const photos = (await board.photos().oldest('createdAt').getResults()).all()

    this.withCover(photos[0] ?? null)

    const details = await super.data()
    const owner = this.showPrivate ? await board.ownerProfile().first() : null
    const runByScout = !!owner && owner.userId !== board.taggedById
    const agreement = runByScout ? await board.agreement() : null

    const blocker = await Commissions.blocker(board)
    const faces = (await board.boardFaces().getResults()).all()

    return {
      ...details,
      rateCard: faces.map((face) => ({
        id: face.id,
        position: face.position,
        label: face.label,
        headingDeg: face.headingDeg,
        rateMinor: board.rateFor(face),
        ownRateMinor: face.ownRate(),
        minPeriods: face.minPeriods,
      })),
      booking: {
        open: !blocker,
        reason: blocker,
        earliestStart: Day.today(await Settings.number('bookings.lead_days')),
        maxPeriods: await Settings.number('bookings.max_periods'),
        printFeeMinor: await PrintJob.feeFor(board),
      },
      photos: await Promise.all(photos.map((photo) => new BoardPhotoResource(photo).of(this.showPrivate ? board : undefined).data())),
      ...(this.showPrivate
        ? {
            owner: owner ? await new OwnerProfileResource(owner).data() : null,
            taggedById: board.taggedById,
            ownPrintFeeMinor: board.printFeeMinor === null ? null : Number(board.printFeeMinor),
            reviewNote: board.reviewNote,
            reviewedAt: board.reviewedAt,
            agreement: agreement ? await new BoardAgreementResource(agreement).data() : null,
            blocks: await ManagedBoardResource.upcomingBlocks(board),
          }
        : {}),
    }
  }

  /** Days the owner keeps that haven't passed yet, soonest first. */
  private static async upcomingBlocks(board: Board) {
    const blocks = await AvailabilityBlock.query()
      .where({ boardId: board.id })
      .whereRaw('ends_on >= current_date')
      .oldest('startsOn')
      .limit(AvailabilityBlock.MAX_UPCOMING)
      .get()

    return blocks.all().map((block) => ({ id: block.id, faceId: block.faceId, ...block.days(), note: block.note }))
  }
}
