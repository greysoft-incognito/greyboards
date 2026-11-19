import { User } from '@app/models/User'
import { Seeder } from '@arkstack/database'
import { MockData } from './MockData'
import { MockBoardSeeder } from './seeders/MockBoardSeeder'
import { MockBookingSeeder } from './seeders/MockBookingSeeder'
import { MockFulfilmentSeeder } from './seeders/MockFulfilmentSeeder'
import { MockMarketSeeder } from './seeders/MockMarketSeeder'
import { MockPageSeeder } from './seeders/MockPageSeeder'
import { MockPaymentRegionSeeder } from './seeders/MockPaymentRegionSeeder'
import { MockPayoutSeeder } from './seeders/MockPayoutSeeder'
import { MockPeopleSeeder } from './seeders/MockPeopleSeeder'
import { MockReputationSeeder } from './seeders/MockReputationSeeder'
import { MockScoutingSeeder } from './seeders/MockScoutingSeeder'

/**
 * Fills a fresh database with demo data: people in every role, boards around the world,
 * bookings in every state and the money, print jobs, proof and reputation that follow them.
 * Only for local, staging and preview databases; `db:mock` refuses to run it in production.
 */
export class MockDataSeeder extends Seeder {
  /** Why mock data can't be seeded here, or null when it can. */
  static async blocker(): Promise<string | null> {
    if (config('app.env') === 'production') return 'Mock data is never seeded in production.'
    if (await User.query().where({ email: MockData.ADMIN_EMAIL }).exists()) return 'This database already has the mock data. Start from an empty database to seed it again.'

    return null
  }

  async run(): Promise<void> {
    const data = new MockData()

    await this.call([
      new MockPageSeeder(data),
      new MockPaymentRegionSeeder(data),
      new MockPeopleSeeder(data),
      new MockBoardSeeder(data),
      new MockScoutingSeeder(data),
      new MockBookingSeeder(data),
      new MockMarketSeeder(data),
      new MockFulfilmentSeeder(data),
      new MockPayoutSeeder(data),
      new MockReputationSeeder(data),
    ])
  }
}
