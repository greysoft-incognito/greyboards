import { DB, Migration } from 'arkormx'

/** Values stored as 'billposter' now read 'dispatch'. The billposter_id columns keep their names. */
const VALUES: [table: string, column: string][] = [
  ['account_roles', 'kind'],
  ['ledger_entries', 'account'],
  ['payouts', 'account'],
  ['bookings', 'printed_by'],
  ['disputes', 'side'],
]

export default class RenameBillposterToDispatchMigration extends Migration {
  public async up(): Promise<void> {}

  public async down(): Promise<void> {}

  public async done(direction: 'up' | 'down'): Promise<void> {
    const [from, to] = direction === 'up' ? ['billposter', 'dispatch'] : ['dispatch', 'billposter']

    for (const [table, column] of VALUES) await DB.raw(`update ${table} set ${column} = '${to}' where ${column} = '${from}'`)

    await DB.raw(`alter table bookings alter column printed_by set default '${to}'`)
  }
}
