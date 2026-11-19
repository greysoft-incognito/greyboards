import { DB, Migration, SchemaBuilder } from 'arkormx'

/**
 * Countries grouped by the currency they price and pay in, and the provider that charges them.
 * Each payment keeps what the payer was actually charged next to the booking's own amount.
 */
export default class CreatePaymentRegionsMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('payment_regions', (table) => {
      table.id('id', 'uuid').primary()
      table.string('name')
      table.json('countries')
      table.string('currency')
      table.string('provider').nullable()
      table.decimal('exchangeRate', 20, 8).nullable().map('exchange_rate')
      table.decimal('rateMarkup', 6, 2).default(0).map('rate_markup')
      table.boolean('active').default(true)
      table.timestamps()
      table.index(['active'])
    })
    schema.alterTable('payments', (table) => {
      table.bigInteger('chargeAmountMinor').nullable().map('charge_amount_minor')
      table.string('chargeCurrency').nullable().map('charge_currency')
      table.decimal('exchangeRate', 20, 8).default(1).map('exchange_rate')
      table.uuid('paymentRegionId').nullable().map('payment_region_id')
    })
  }

  /** Payments made before regions were charged exactly what they were for. */
  public async done(direction: 'up' | 'down'): Promise<void> {
    if (direction !== 'up') return

    await DB.raw(`update payments set charge_amount_minor = amount_minor, charge_currency = currency where charge_amount_minor is null`)
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('payments', (table) => {
      table.dropColumn('charge_amount_minor')
      table.dropColumn('charge_currency')
      table.dropColumn('exchange_rate')
      table.dropColumn('payment_region_id')
    })
    schema.dropTable('payment_regions')
  }
}
