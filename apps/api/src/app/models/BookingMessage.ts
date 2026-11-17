import { Model } from '@arkstack/database'
import { StoredImage } from '@app/support/StoredImage'

/** A message about a booking, with an optional photo as evidence. */
export class BookingMessage extends Model {
  declare id: string
  declare bookingId: string
  declare authorId: string | null
  declare body: string | null
  declare photoPath: string | null
  declare photoDisk: string | null
  declare photoWidth: number | null
  declare photoHeight: number | null
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'booking_messages'

  protected static override columns = {
    bookingId: 'booking_id',
    authorId: 'author_id',
    photoPath: 'photo_path',
    photoDisk: 'photo_disk',
    photoWidth: 'photo_width',
    photoHeight: 'photo_height',
  }

  photoUrl(): Promise<string | null> {
    return this.photoPath && this.photoDisk ? StoredImage.url(this.photoDisk, this.photoPath) : Promise.resolve(null)
  }
}
