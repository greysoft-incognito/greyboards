import { Command } from '@h3ravel/musket'
import { Booking } from '@app/models/Booking'
import { Shares } from '@app/services/Shares'

/** What the schedule runs: pays out proofs left unchecked past the deadline, closes finished bookings and refunds shared bookings that lapsed. */
export class SettleBookingsCommand extends Command {
  signature = 'bookings:settle'

  description = 'Accept overdue proofs of posting and complete finished bookings'

  async handle() {
    const accepted = await Booking.acceptOverdueProofs()

    await Booking.completeEnded()
    await Shares.refundLapsed()

    this.success(`Accepted ${accepted} overdue ${accepted === 1 ? 'proof' : 'proofs'}.`)
  }
}
