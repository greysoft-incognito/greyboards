import type { Board } from '@app/models/Board'
import type { BoardPhoto } from '@app/models/BoardPhoto'
import { Resource } from 'resora'

/** A photo of a board. Given the board, it also says how far from it the photo was taken. */
export class BoardPhotoResource extends Resource {
  private board?: Board

  /** Measure how far from `board` the photo was taken. */
  of(board?: Board): this {
    this.board = board

    return this
  }

  async data() {
    const photo = this.resource as BoardPhoto

    return {
      id: photo.id,
      url: await photo.url(),
      width: photo.width,
      height: photo.height,
      latitude: photo.latitude,
      longitude: photo.longitude,
      accuracyM: photo.accuracyM,
      distanceM: this.board ? photo.distanceFrom(this.board) : null,
      takenAt: photo.takenAt,
      createdAt: photo.createdAt,
    }
  }
}
