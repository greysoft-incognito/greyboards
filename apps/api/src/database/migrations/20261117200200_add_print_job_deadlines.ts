import { Migration, SchemaBuilder } from 'arkormx'

export default class AddPrintJobDeadlinesMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('print_jobs', (table) => {
      table.bigInteger('bonusMinor').default(0).map('bonus_minor')
      table.timestamp('unclaimedAlertAt').nullable().map('unclaimed_alert_at')
    })

    schema.createTable('print_job_misses', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('printJobId')
        .map('print_job_id')
        .foreign()
        .references('print_jobs', 'id')
        .onDelete('cascade')
        .as('printJob')
        .inverseAlias('misses')
      table
        .uuid('billposterId')
        .map('billposter_id')
        .foreign()
        .references('users', 'id')
        .onDelete('cascade')
        .as('billposter')
        .inverseAlias('printJobMisses')
      table.string('stage')
      table.timestamps()
      table.index(['billposterId', 'createdAt'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('print_job_misses')

    schema.alterTable('print_jobs', (table) => {
      table.dropColumn('bonusMinor')
      table.dropColumn('unclaimedAlertAt')
    })
  }
}
