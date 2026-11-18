import { abortIf } from '@arkstack/common'
import { Auction } from '@app/models/Auction'
import { AvailabilityBlock } from '@app/models/AvailabilityBlock'
import type { BoardFace } from '@app/models/BoardFace'
import type { Board } from '@app/models/Board'
import { Booking } from '@app/models/Booking'
import type { User } from '@app/models/User'
import { Day } from '@app/support/Day'

export interface BlockInput {
  startsOn: string
  endsOn: string
  /** One face, or the whole board when left out. */
  faceId?: string | null
  note?: string | null
}

/** Days owners keep off the market for their own clients. */
export class Availability {
  /** Block days on a face, or the whole board. Days already booked can't be blocked. */
  static async block(board: Board, user: User, input: BlockInput): Promise<AvailabilityBlock> {
    const face = input.faceId ? await board.faceFor(input.faceId) : null
    const upcoming = await AvailabilityBlock.query().where({ boardId: board.id }).whereRaw('ends_on >= current_date').count()

    abortIf(!Day.valid(input.startsOn) || !Day.valid(input.endsOn), 'Choose the first and last day to block.', 422)
    abortIf(input.endsOn < input.startsOn, 'The last day must be on or after the first.', 422)
    abortIf(input.startsOn < Day.today(), 'Choose today or a later date.', 422)
    abortIf(Day.between(input.startsOn, input.endsOn) >= AvailabilityBlock.MAX_DAYS, 'Block up to a year at a time.', 422)
    abortIf(upcoming >= AvailabilityBlock.MAX_UPCOMING, `You can have up to ${AvailabilityBlock.MAX_UPCOMING} blocked periods. Remove one first.`, 422)

    await Booking.expireHolds()

    const booked = await Booking.query()
      .where({ boardId: board.id })
      .whereIn('status', Booking.TAKING)
      .whereRaw('ends_on >= ? and starts_on <= ?', [input.startsOn, input.endsOn])
      .when(!!face, (query) => query.where({ faceId: face!.id }))
      .exists()

    abortIf(booked, 'Some of those days are already booked. Choose different days.', 409)
    abortIf(await Availability.biddingOn(board, face, input.startsOn, input.endsOn), 'Some of those days are open for bids. Choose different days.', 409)

    return AvailabilityBlock.query().create({
      boardId: board.id,
      faceId: face?.id ?? null,
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      note: input.note?.trim() || null,
      createdById: user.id,
    })
  }

  /** Whether bidding covers any of the days, on the face or any face when blocking the whole board. */
  private static biddingOn(board: Board, face: BoardFace | null, from: string, to: string): Promise<boolean> {
    return Auction.query()
      .where({ boardId: board.id })
      .whereIn('status', Auction.TAKING)
      .whereRaw('ends_on >= ? and starts_on <= ?', [from, to])
      .when(!!face, (query) => query.where({ faceId: face!.id }))
      .exists()
  }
}
