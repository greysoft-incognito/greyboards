import { Command } from '@h3ravel/musket'
import { MockData } from 'src/database/mock/MockData'
import { MockDataSeeder } from 'src/database/mock/MockDataSeeder'

/** Seeds demo data for local, staging and preview databases. */
export class SeedMockDataCommand extends Command {
  signature = 'db:mock'

  description = 'Fill a fresh database with demo people, boards and bookings (never in production)'

  async handle() {
    const blocker = await MockDataSeeder.blocker()

    if (blocker) {
      this.error(blocker)

      return
    }

    await new MockDataSeeder().run()

    this.success(`Mock data is in. Sign in as ${MockData.ADMIN_EMAIL} with the password "${MockData.PASSWORD}".`)
  }
}
