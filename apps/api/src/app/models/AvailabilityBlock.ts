import { Model } from '@arkstack/database'
import { Day } from '@app/support/Day'

/** Days an owner keeps for their own clients. With no face, the whole board is blocked. */
export class AvailabilityBlock extends Model {
  declare id: string
  declare boardId: string
  declare faceId: string | null
  declare startsOn: Date | string
  declare endsOn: Date | string
  declare note: string | null
  declare createdById: string | null
  declare createdAt: Date
  declare updatedAt: Date

  /** Upcoming blocks kept per board. */
  static readonly MAX_UPCOMING = 100

  /** The longest run one block can cover, in days. */
  static readonly MAX_DAYS = 366

  protected static override table = 'availability_blocks'

  protected static override columns = {
    boardId: 'board_id',
    faceId: 'face_id',
    startsOn: 'starts_on',
    endsOn: 'ends_on',
    createdById: 'created_by_id',
  }

  days(): { startsOn: string; endsOn: string } {
    return { startsOn: Day.of(this.startsOn), endsOn: Day.of(this.endsOn) }
  }
}
