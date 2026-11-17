import { Migration, SchemaBuilder } from 'arkormx'

export default class AddProofToBookingsMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('bookings', (table) => {
      table.string('proofStatus').default('none').map('proof_status')
      table.string('proofNote').nullable().map('proof_note')
      table.timestamp('proofSubmittedAt').nullable().map('proof_submitted_at')
      table.timestamp('proofAcceptedAt').nullable().map('proof_accepted_at')
      table.timestamp('releasedAt').nullable().map('released_at')
      table.index(['proofStatus', 'proofSubmittedAt'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('bookings', (table) => {
      for (const column of ['proofStatus', 'proofNote', 'proofSubmittedAt', 'proofAcceptedAt', 'releasedAt']) table.dropColumn(column)
    })
  }
}
