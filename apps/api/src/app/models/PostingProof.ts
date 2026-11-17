import { Model } from '@arkstack/database'
import { StoredImage } from '@app/support/StoredImage'
import { BoardPhoto, type BoardPhotoInput } from './BoardPhoto'
import type { Board } from './Board'
import { Booking } from './Booking'
import type { UploadedFile, User } from './User'

/** Where the phone was when a proof photo was taken. Proof needs a location. */
export interface ProofLocation extends BoardPhotoInput {
  latitude: number
  longitude: number
}

/**
 * A geotagged photo of a booked ad up on its board. Enough of them, taken close enough to
 * the board and accepted by the advertiser, release the booking's money.
 */
export class PostingProof extends Model {
  declare id: string
  declare bookingId: string
  declare uploadedById: string | null
  declare path: string
  declare disk: string
  declare width: number
  declare height: number
  declare latitude: number
  declare longitude: number
  declare accuracyM: number | null
  declare distanceM: number
  declare takenAt: Date | null
  declare createdAt: Date
  declare updatedAt: Date

  /** Photos one booking can carry. */
  static readonly MAX_PER_BOOKING = 6

  protected static override table = 'posting_proofs'

  protected static override columns = {
    bookingId: 'booking_id',
    uploadedById: 'uploaded_by_id',
    accuracyM: 'accuracy_m',
    distanceM: 'distance_m',
    takenAt: 'taken_at',
  }

  protected override casts = {
    latitude: 'number',
    longitude: 'number',
    distanceM: 'number',
  } as never

  /** Metres between where the photo was taken and `board`. */
  static distanceFrom(board: Board, where: ProofLocation): number {
    return BoardPhoto.distance(board.latitude, board.longitude, where.latitude, where.longitude)
  }

  /** Save a photo for `booking`, taken `distanceM` from its board. */
  static async store(booking: Booking, user: User, file: UploadedFile, where: ProofLocation, distanceM: number): Promise<PostingProof> {
    const saved = await StoredImage.save(`bookings/${booking.id}/proof`, file)

    return PostingProof.query().create({
      bookingId: booking.id,
      uploadedById: user.id,
      path: saved.path,
      disk: saved.disk,
      width: saved.width,
      height: saved.height,
      latitude: where.latitude,
      longitude: where.longitude,
      accuracyM: where.accuracyM ?? null,
      distanceM,
      takenAt: where.takenAt ?? null,
    })
  }

  booking() {
    return this.belongsTo(Booking, 'bookingId')
  }

  url(): Promise<string> {
    return StoredImage.url(this.disk, this.path)
  }

  async remove(): Promise<void> {
    await StoredImage.remove(this.disk, this.path)
    await this.delete()
  }
}
