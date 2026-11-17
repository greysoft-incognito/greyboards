import { Migration, SchemaBuilder } from 'arkormx'

/**
 * Campaign reports: an advertiser groups bookings into one report, with the boards, the
 * dates and the proof photos, and shares it by an unguessable link.
 */
export default class CreateCampaignReportsMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('campaign_reports', (table) => {
      table.id('id', 'uuid').primary()
      table.uuid('userId').map('user_id')
      table.string('title')
      table.string('token').unique()
      table.timestamps()
      table.index(['userId', 'createdAt'])
    })

    schema.createTable('campaign_report_bookings', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('reportId')
        .map('report_id')
        .foreign()
        .references('campaign_reports', 'id')
        .onDelete('cascade')
        .as('report')
        .inverseAlias('runs')
      table
        .uuid('bookingId')
        .map('booking_id')
        .foreign()
        .references('bookings', 'id')
        .onDelete('cascade')
        .as('booking')
        .inverseAlias('reportRuns')
      table.integer('position')
      table.timestamps()
      table.index(['reportId', 'position'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('campaign_report_bookings')
    schema.dropTable('campaign_reports')
  }
}
