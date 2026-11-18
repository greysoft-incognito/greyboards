import { DB, Migration, SchemaBuilder } from 'arkormx'

/**
 * Once a shared booking's lock ends with shares unpaid, the whole board goes up for bids. The
 * auction points at the shared booking, and the winner has until `pay_by` to pay for it.
 */
export default class AddTakeoverToAuctionsMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('auctions', (table) => {
      table.uuid('sharedBookingId').nullable().map('shared_booking_id')
      table.timestamp('payBy').nullable().map('pay_by')
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('auctions', (table) => {
      table.dropColumn('shared_booking_id')
      table.dropColumn('pay_by')
    })
  }

  public async done(direction: 'up' | 'down'): Promise<void> {
    if (direction === 'up') {
      await DB.raw("create unique index if not exists auctions_takeover_live on auctions (shared_booking_id) where status in ('open', 'awarded')")
    }
  }
}
