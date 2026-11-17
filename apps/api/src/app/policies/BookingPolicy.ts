import type { Booking } from '@app/models/Booking'
import { Board } from '@app/models/Board'
import { PrintJob } from '@app/models/PrintJob'
import type { User } from '@app/models/User'
import { BoardPolicy } from './BoardPolicy'

/** Who may see and act on a booking. The one place these rules live. */
export class BookingPolicy {
  /** The advertiser who made it, whoever looks after the board, and staff who handle bookings. */
  static async view(user: User, booking: Booking): Promise<boolean> {
    if (BookingPolicy.owns(user, booking)) return true
    if (await BookingPolicy.managesBoard(user, booking)) return true

    return user.can('bookings.view')
  }

  /** Only the advertiser pays for or cancels their booking. */
  static owns(user: User, booking: Booking): boolean {
    return booking.advertiserId === user.id
  }

  /** Whether `user` looks after the booked board, and so sees what they'll be paid. */
  static async managesBoard(user: User, booking: Booking): Promise<boolean> {
    const board = await Board.query().find(booking.boardId)

    return !!board && (await BoardPolicy.manages(user, board))
  }

  /** Who photographs the ad on the board: the billposter holding its print job, or whoever looks after a board with none. */
  static async postsProof(user: User, booking: Booking): Promise<boolean> {
    const job = await PrintJob.query().where({ bookingId: booking.id }).first()

    return job ? job.isHeldBy(user) : BookingPolicy.managesBoard(user, booking)
  }
}
