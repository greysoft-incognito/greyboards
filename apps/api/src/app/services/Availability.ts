import { abortIf } from '@arkstack/common'
import { AvailabilityBlock } from '@app/models/AvailabilityBlock'
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

    abortIf(!Day.valid(input.startsOn) || !Day.valid(input.endsOn), 'Pick the first and last day to block.', 422)
    abortIf(input.endsOn < input.startsOn, 'The last day must be on or after the first.', 422)
    abortIf(input.startsOn < Day.today(), 'Pick days from today on.', 422)
    abortIf(Day.between(input.startsOn, input.endsOn) >= AvailabilityBlock.MAX_DAYS, 'Block up to a year at a time.', 422)
    abortIf(upcoming >= AvailabilityBlock.MAX_UPCOMING, `A board can have up to ${AvailabilityBlock.MAX_UPCOMING} blocks ahead. Remove one first.`, 422)

    await Booking.expireHolds()

    const booked = await Booking.query()
      .where({ boardId: board.id })
      .whereIn('status', Booking.TAKING)
      .whereRaw('ends_on >= ? and starts_on <= ?', [input.startsOn, input.endsOn])
      .when(!!face, (query) => query.where({ faceId: face!.id }))
      .exists()

    abortIf(booked, 'Some of those days are already booked. Pick days around the bookings.', 409)

    return AvailabilityBlock.query().create({
      boardId: board.id,
      faceId: face?.id ?? null,
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      note: input.note?.trim() || null,
      createdById: user.id,
    })
  }
}
