import { Document } from '@app/models/Document'
import { DocumentSeeder } from 'src/database/seeders/DocumentSeeder'
import { MockSeeder } from '../MockSeeder'

/** The standard pages and policies, plus two extra pages so admins have custom pages to edit. */
export class MockPageSeeder extends MockSeeder {
  async run(): Promise<void> {
    await new DocumentSeeder().run()

    const pages = [
      {
        slug: 'advertise-in-kaduna',
        title: 'Advertise in Kaduna',
        summary: 'Where the busiest boards are, and what they cost.',
        body: '## Kaduna is live\n\nGreyboards started in Kaduna, with boards on Ahmadu Bello Way, Kano Road, Ali Akilu Road and around the Central Market.\n\nMost boards rent by the month, and street furniture by the week. Pick dates on the map, upload your design, and a dispatcher prints and puts it up. You get photos of your ad on the board before the owner is paid.',
      },
      {
        slug: 'become-a-scout',
        title: 'Become a scout',
        summary: 'Earn from every booking on the boards you bring in.',
        body: '## Bring boards in, earn on every booking\n\nScouts find billboards, sign their owners up on the spot and look after the boards. You earn {{ revenue.scout_percent }}% of the rent on every booking a board you brought in gets.\n\nApply from your account under Roles. We check your ID before you start.',
      },
    ]

    for (const page of pages) {
      if (await Document.query().where({ slug: page.slug }).exists()) continue

      await Document.open({ ...page, published: true })
    }
  }
}
