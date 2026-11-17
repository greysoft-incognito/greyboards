import { Model } from '@arkstack/database'
import { Storage } from '@arkstack/filesystem'
import { randomUUID } from 'node:crypto'
import { ImageFile } from '@app/support/ImageFile'
import type { Board } from './Board'
import type { UploadedFile, User } from './User'

/** Where the phone was when a photo was taken, as the app reports it. */
export interface BoardPhotoInput {
  latitude?: number | null
  longitude?: number | null
  accuracyM?: number | null
  takenAt?: Date | null
}

/** A photo of a board, kept with where it was taken so reviewers can tell it was taken there. */
export class BoardPhoto extends Model {
  declare id: string
  declare boardId: string
  declare takenById: string | null
  declare path: string
  declare disk: string
  declare width: number
  declare height: number
  declare latitude: number | null
  declare longitude: number | null
  declare accuracyM: number | null
  declare takenAt: Date | null
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'board_photos'

  protected static override columns = {
    boardId: 'board_id',
    takenById: 'taken_by_id',
    accuracyM: 'accuracy_m',
    takenAt: 'taken_at',
  }

  /** Metres between two points, along the earth's surface. */
  static distance(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
    const radians = (degrees: number) => (degrees * Math.PI) / 180
    const dLat = radians(toLat - fromLat)
    const dLng = radians(toLng - fromLng)
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(fromLat)) * Math.cos(radians(toLat)) * Math.sin(dLng / 2) ** 2

    return Math.round(6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
  }

  static async store(board: Board, user: User, file: UploadedFile, input: BoardPhotoInput): Promise<BoardPhoto> {
    const image = ImageFile.read(file.buffer)!
    const disk = ImageFile.disk()
    const path = `boards/${board.id}/${randomUUID()}.${ImageFile.extension(image.mimeType)}`

    await Storage.disk(disk as never).put(path, new Uint8Array(file.buffer))

    return BoardPhoto.query().create({
      boardId: board.id,
      takenById: user.id,
      path,
      disk,
      width: image.width,
      height: image.height,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      accuracyM: input.accuracyM ?? null,
      takenAt: input.takenAt ?? null,
    })
  }

  url(): Promise<string> {
    return Storage.disk(this.disk as never).getSignedUrl(this.path, { expiresIn: '6h' })
  }

  /** Metres from the board, when the photo has a location. */
  distanceFrom(board: Board): number | null {
    if (this.latitude === null || this.longitude === null) return null

    return BoardPhoto.distance(board.latitude, board.longitude, this.latitude, this.longitude)
  }

  async remove(): Promise<void> {
    await this.delete()
    await Storage.disk(this.disk as never)
      .delete(this.path)
      .catch(() => undefined)
  }
}
