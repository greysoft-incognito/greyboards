import type { Board } from '@app/models/Board'
import { Commissions } from '@app/services/Commissions'
import { AvailabilityBlock } from '@app/models/AvailabilityBlock'
import { Day } from '@app/support/Day'
import { PrintJob } from '@app/models/PrintJob'
import { Settings } from '@app/support/Settings'
import { Reputation, type RoleStanding } from '@app/services/Reputation'
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
    const owner = await board.ownerProfile().first()
    const runByScout = !!owner && owner.userId !== board.taggedById
    const agreement = runByScout && this.showPrivate ? await board.agreement() : null

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
        ownerRateMinor: this.showPrivate ? face.ownerRate() : null,
        minPeriods: face.minPeriods,
      })),
      booking: {
        open: !blocker,
        reason: blocker,
        earliestStart: Day.today(await Settings.number('bookings.lead_days')),
        maxPeriods: await Settings.number('bookings.max_periods'),
        printFeeMinor: await PrintJob.feeFor(board),
        shares: await ManagedBoardResource.shareTerms(),
      },
      /** How far the people behind the board can be trusted, by role. Names stay private. */
      stewards: await ManagedBoardResource.stewards(owner?.userId ?? null, runByScout ? board.taggedById : null),
      photos: await Promise.all(photos.map((photo) => new BoardPhotoResource(photo).of(this.showPrivate ? board : undefined).data())),
      ...(this.showPrivate
        ? {
            owner: owner && this.showPrivate ? await new OwnerProfileResource(owner).data() : null,
            taggedById: board.taggedById,
            measuredTraffic: board.dailyTraffic,
            ownLoopSlots: board.loopSlots,
            ownSlotSeconds: board.slotSeconds,
            player: board.isDigital() ? { connected: !!board.playerTokenHash, seenAt: board.playerSeenAt } : null,
            ownerNet: !!board.ownerNet,
            ownerRateMinor: board.ownerRate(),
            ownerPercent: await Commissions.ownerPercent(board),
            ownPrintFeeMinor: board.printFeeMinor === null ? null : Number(board.printFeeMinor),
            reviewNote: board.reviewNote,
            reviewedAt: board.reviewedAt,
            agreement: agreement ? await new BoardAgreementResource(agreement).data() : null,
            blocks: await ManagedBoardResource.upcomingBlocks(board),
          }
        : {}),
    }
  }

  private static async stewards(ownerUserId: string | null, scoutId: string | null): Promise<RoleStanding[]> {
    const owner = ownerUserId ? await Reputation.standing(ownerUserId, 'owner') : null
    const scout = scoutId ? await Reputation.standing(scoutId, 'scout') : null

    return [owner, scout].filter((standing): standing is RoleStanding => !!standing)
  }

  /** Whether bookings can be split with others, between how many, and from when. */
  private static async shareTerms() {
    const payHours = await Settings.number('shares.pay_hours')

    return {
      enabled: !!(await Settings.get('shares.enabled')),
      max: await Settings.number('shares.max_shares'),
      earliestStart: Day.today((await Settings.number('bookings.lead_days')) + Math.ceil(payHours / 24)),
      payHours,
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
