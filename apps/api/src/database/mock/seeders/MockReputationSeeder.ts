import { AccountRole } from '@app/models/AccountRole'
import { Booking } from '@app/models/Booking'
import { User } from '@app/models/User'
import { Reputation } from '@app/services/Reputation'
import { MockSeeder } from '../MockSeeder'
import type { MockBookingRecord } from './MockBookingSeeder'

/**
 * Reputation earned the way it is in the app: every accepted campaign credits whoever put it
 * up, the board's side and the advertiser, scouts earn for owners who signed, a missed job
 * costs the dispatcher, staff adjust a score, and the sweep hands out the proven badge. Staff
 * verified badges come with the roles.
 */
export class MockReputationSeeder extends MockSeeder {
  async run(): Promise<void> {
    for (const record of this.data.all<MockBookingRecord>('bookings').filter((entry) => entry.acceptedAt)) {
      await Reputation.campaignChecked(await Booking.query().findOrFail(record.id))
    }

    for (const agreement of this.data.all('agreements').filter((entry) => entry.signed)) {
      await Reputation.award(String(agreement.scoutId), 'scout', 'signed', agreement.id)
    }

    await Reputation.award(this.data.get('users', 'esther').id, 'dispatch', 'missed', this.data.get('misses', 'esther').id)

    const admin = await User.query().findOrFail(this.data.get('users', 'admin').id)
    const halima = await AccountRole.query().findOrFail(this.data.get('roles', 'halima:scout').id)

    await Reputation.adjust(halima, admin, 5, 'Re-surveyed the Sabon Tasha shelters after the storm, unpaid.')
    await Reputation.sweep()
  }
}
