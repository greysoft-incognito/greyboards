import { Command } from '@h3ravel/musket'
import { Booking } from '@app/models/Booking'

/** What the schedule runs: pays out proofs left unchecked past the deadline and closes finished bookings. */
export class SettleBookingsCommand extends Command {
  signature = 'bookings:settle'

  description = 'Accept overdue proofs of posting and complete finished bookings'

  async handle() {
    const accepted = await Booking.acceptOverdueProofs()

    await Booking.completeEnded()

    this.success(`Accepted ${accepted} overdue ${accepted === 1 ? 'proof' : 'proofs'}.`)
  }
}
