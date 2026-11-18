import type { Booking } from '@app/models/Booking'
import { Board } from '@app/models/Board'
import { PrintJob } from '@app/models/PrintJob'
import type { User } from '@app/models/User'
import { Shares } from '@app/services/Shares'
import { BoardPolicy } from './BoardPolicy'

/** Who may see and act on a booking. The one place these rules live. */
export class BookingPolicy {
  /** The advertiser who made it, whoever looks after the board, and staff who handle bookings. */
  static async view(user: User, booking: Booking): Promise<boolean> {
    if (BookingPolicy.owns(user, booking)) return true
    if (booking.shared && (await Shares.holds(user, booking))) return true
    if (await BookingPolicy.managesBoard(user, booking)) return true

    return user.can('bookings.view')
  }

  /** Who reads and writes its messages: anyone who sees the booking, and the dispatcher on its print job. */
  static async talks(user: User, booking: Booking): Promise<boolean> {
    if (await BookingPolicy.view(user, booking)) return true

    const job = await PrintJob.query().where({ bookingId: booking.id }).first()

    return !!job && job.isHeldBy(user)
  }

  /** Who pays: the advertiser, or on a shared booking, anyone holding a share. */
  static async pays(user: User, booking: Booking): Promise<boolean> {
    return BookingPolicy.owns(user, booking) || (booking.shared && (await Shares.holds(user, booking)))
  }

  /** Only the advertiser, the organiser of a shared booking, cancels it or sends the artwork. */
  static owns(user: User, booking: Booking): boolean {
    return booking.advertiserId === user.id
  }

  /** Whether `user` looks after the booked board, and so sees what they'll be paid. */
  static async managesBoard(user: User, booking: Booking): Promise<boolean> {
    const board = await Board.query().find(booking.boardId)

    return !!board && (await BoardPolicy.manages(user, board))
  }

  /**
   * Who photographs the ad on the board: the dispatcher holding its print job, or whoever
   * looks after the board when there's no job or nobody has taken it (they step in).
   */
  static async postsProof(user: User, booking: Booking): Promise<boolean> {
    const job = await PrintJob.query().where({ bookingId: booking.id }).first()

    return job && !job.isAvailable() && job.status !== PrintJob.CANCELLED ? job.isHeldBy(user) : BookingPolicy.managesBoard(user, booking)
  }
}
