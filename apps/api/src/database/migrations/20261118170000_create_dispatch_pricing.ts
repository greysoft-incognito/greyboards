import { DB, Migration, SchemaBuilder } from 'arkormx'

/**
 * Dispatchers set their own prices. Each keeps a rate and the area they cover; on a print
 * job they send a price (a bid), or answer an advertiser's request at their rate. The
 * advertiser pays the price they pick, and the job is that dispatcher's.
 */
export default class CreateDispatchPricingMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('dispatch_rates', (table) => {
      table.id('id', 'uuid').primary()
      table.uuid('userId').unique().map('user_id')
      table.bigInteger('pricePerSqmMinor').map('price_per_sqm_minor')
      table.bigInteger('minFeeMinor').default(0).map('min_fee_minor')
      table.float('latitude')
      table.float('longitude')
      table.integer('radiusKm').map('radius_km')
      table.string('note').nullable()
      table.timestamps()
    })

    schema.createTable('print_offers', (table) => {
      table.id('id', 'uuid').primary()
      table.uuid('printJobId').map('print_job_id')
      table.uuid('dispatcherId').map('dispatcher_id')
      table.string('kind')
      table.string('status')
      table.bigInteger('amountMinor').map('amount_minor')
      table.string('note').nullable()
      table.timestamp('expiresAt').map('expires_at')
      table.timestamps()
      table.index(['printJobId', 'status'])
      table.index(['dispatcherId', 'status'])
    })

    schema.alterTable('payments', (table) => {
      table.uuid('printOfferId').nullable().map('print_offer_id')
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('payments', (table) => {
      table.dropColumn('printOfferId')
    })
    schema.dropTable('print_offers')
    schema.dropTable('dispatch_rates')
  }

  public async done(direction: 'up' | 'down'): Promise<void> {
    if (direction === 'up') {
      await DB.raw("create unique index if not exists print_offers_live on print_offers (print_job_id, dispatcher_id) where status in ('requested', 'pending')")
    }
  }
}
