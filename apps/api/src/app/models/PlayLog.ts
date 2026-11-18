import { Model } from '@arkstack/database'

/** One play of a booking's ad on a digital screen, as the screen's player reported it. */
export class PlayLog extends Model {
  declare id: string
  declare bookingId: string
  declare boardId: string
  declare faceId: string | null
  declare playedAt: Date
  declare durationMs: number
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'play_logs'

  protected static override columns = {
    bookingId: 'booking_id',
    boardId: 'board_id',
    faceId: 'face_id',
    playedAt: 'played_at',
    durationMs: 'duration_ms',
  }
}
