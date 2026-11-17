import type { Board } from '@app/models/Board'
import { BoardPhoto } from '@app/models/BoardPhoto'
import { BoardResource } from './BoardResource'
import { Collection } from './Collection'

/** A page of boards. Loads every cover photo in one query rather than one per board. */
export class BoardCollection extends Collection {
  collects = BoardResource

  data() {
    const boards = this.items() as Board[]
    const Item = this.collects as typeof BoardResource
    const covers = BoardCollection.covers(boards)

    return boards.map(async (board) => new Item(board).withCover((await covers).get(board.id) ?? null).data()) as never
  }

  /** The oldest photo of each board, by board id. */
  private static async covers(boards: Board[]): Promise<Map<string, BoardPhoto>> {
    const covers = new Map<string, BoardPhoto>()

    if (!boards.length) return covers

    const photos = await BoardPhoto.query()
      .whereIn(
        'boardId',
        boards.map((board) => board.id),
      )
      .oldest('createdAt')
      .get()

    for (const photo of photos.all()) if (!covers.has(photo.boardId)) covers.set(photo.boardId, photo)

    return covers
  }
}
