import { Board } from '@app/models/Board'
import type { Booking } from '@app/models/Booking'
import { BookingResource } from './BookingResource'
import { Collection } from './Collection'

/** A page of bookings. Their boards load in one query rather than one per booking. */
export class BookingCollection extends Collection {
  collects = BookingResource

  private showSplit = false

  withSplit(show: boolean): this {
    this.showSplit = show

    return this
  }

  data() {
    const bookings = this.items() as Booking[]
    const boards = BookingCollection.boards(bookings)

    return bookings.map(async (booking) =>
      new BookingResource(booking)
        .onBoard((await boards).get(booking.boardId) ?? null)
        .withSplit(this.showSplit)
        .data(),
    ) as never
  }

  private static async boards(bookings: Booking[]): Promise<Map<string, Board>> {
    const ids = [...new Set(bookings.map((booking) => booking.boardId))]
    const boards = ids.length ? (await Board.query().whereIn('id', ids).get()).all() : []

    return new Map(boards.map((board) => [board.id, board]))
  }
}
