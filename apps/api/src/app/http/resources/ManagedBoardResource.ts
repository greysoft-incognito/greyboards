import type { Board } from '@app/models/Board'
import { BoardPhotoResource } from './BoardPhotoResource'
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

    return {
      ...details,
      photos: await Promise.all(photos.map((photo) => new BoardPhotoResource(photo).of(this.showPrivate ? board : undefined).data())),
      ...(this.showPrivate
        ? {
            ownerName: board.ownerName,
            ownerPhone: board.ownerPhone,
            ownerId: board.ownerId,
            taggedById: board.taggedById,
            reviewNote: board.reviewNote,
            reviewedAt: board.reviewedAt,
          }
        : {}),
    }
  }
}
