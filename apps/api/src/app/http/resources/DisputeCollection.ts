import { Board } from '@app/models/Board'
import { Booking } from '@app/models/Booking'
import type { Dispute } from '@app/models/Dispute'
import { User } from '@app/models/User'
import { Disputes } from '@app/services/Disputes'
import { Collection } from './Collection'

/** A page of disputes for staff, each with its booking, board and who raised and decided it, loaded once per page. */
export class DisputeCollection extends Collection {
  data() {
    const disputes = this.items() as Dispute[]
    const related = DisputeCollection.related(disputes)

    return disputes.map(async (dispute) => {
      const { bookings, boards, names } = await related
      const booking = bookings.get(dispute.bookingId)
      const board = booking ? boards.get(booking.boardId) : undefined

      return {
        ...DisputeCollection.present(dispute, names),
        booking: booking
          ? {
              id: booking.id,
              status: booking.displayStatus(),
              ...booking.days(),
              amountMinor: booking.amountMinor,
              currency: booking.currency,
              proofStatus: booking.proofStatus,
              inEscrow: booking.status === Booking.PAID,
              board: board ? { id: board.id, name: board.name } : null,
            }
          : null,
      }
    }) as never
  }

  /** One dispute as the API sends it. */
  static present(dispute: Dispute, names: Map<string, string>) {
    return {
      id: dispute.id,
      side: dispute.side,
      reason: dispute.reason,
      reasonLabel: Disputes.reasonLabel(dispute.reason),
      details: dispute.details,
      status: dispute.status,
      decision: dispute.decision,
      decisionLabel: dispute.decision ? Disputes.decisionLabel(dispute.decision) : null,
      refundMinor: dispute.refundMinor,
      resolution: dispute.resolution,
      openedBy: names.get(dispute.openedById) ?? null,
      resolvedBy: dispute.resolvedById ? (names.get(dispute.resolvedById) ?? null) : null,
      resolvedAt: dispute.resolvedAt,
      createdAt: dispute.createdAt,
    }
  }

  /** Names of everyone who raised or decided one of `disputes`. */
  static async names(disputes: Dispute[]): Promise<Map<string, string>> {
    const ids = [...new Set(disputes.flatMap((dispute) => [dispute.openedById, dispute.resolvedById]).filter((id): id is string => !!id))]
    const users = ids.length ? (await User.query().whereIn('id', ids).get()).all() : []

    return new Map(users.map((user) => [user.id, user.name]))
  }

  private static async related(disputes: Dispute[]) {
    const bookingIds = [...new Set(disputes.map((dispute) => dispute.bookingId))]
    const bookings = bookingIds.length ? (await Booking.query().whereIn('id', bookingIds).get()).all() : []
    const boardIds = [...new Set(bookings.map((booking) => booking.boardId))]
    const boards = boardIds.length ? (await Board.query().whereIn('id', boardIds).get()).all() : []

    return {
      bookings: new Map(bookings.map((booking) => [booking.id, booking])),
      boards: new Map(boards.map((board) => [board.id, board])),
      names: await DisputeCollection.names(disputes),
    }
  }
}
