import { DB, Migration, SchemaBuilder } from 'arkormx'

/**
 * Reputation is kept per marketplace role. Each checked action is one event, and the role
 * keeps the running score, the action count and its two badges: verified by staff, and
 * proven by reaching the milestones.
 */
export default class CreateReputationMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('account_roles', (table) => {
      table.integer('reputation').default(0)
      table.integer('reputationActions').default(0).map('reputation_actions')
      table.timestamp('verifiedAt').nullable().map('verified_at')
      table.uuid('verifiedById').nullable().map('verified_by_id')
      table.string('verifiedNote').nullable().map('verified_note')
      table.timestamp('provenAt').nullable().map('proven_at')
    })

    schema.createTable('reputation_events', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('accountRoleId')
        .map('account_role_id')
        .foreign()
        .references('account_roles', 'id')
        .onDelete('cascade')
        .as('accountRole')
        .inverseAlias('reputationEvents')
      table.uuid('userId').map('user_id')
      table.string('kind')
      table.string('action')
      table.integer('points')
      table.uuid('subjectId').nullable().map('subject_id')
      table.string('note').nullable()
      table.uuid('createdById').nullable().map('created_by_id')
      table.timestamps()
      table.index(['accountRoleId', 'createdAt'])
    })
  }

  public async done(direction: 'up' | 'down'): Promise<void> {
    if (direction === 'up') {
      await DB.raw('create unique index if not exists reputation_events_once on reputation_events (account_role_id, action, subject_id) where subject_id is not null')
      await DB.raw('create index if not exists account_roles_proven on account_roles (kind, reputation) where proven_at is null')
    }

    await DB.raw(
      direction === 'up'
        ? `update roles set permissions = permissions::jsonb || '["reputation.manage"]'::jsonb where slug = 'reviewer' and not permissions::jsonb ? 'reputation.manage'`
        : `update roles set permissions = permissions::jsonb - 'reputation.manage' where slug = 'reviewer'`,
    )
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('reputation_events')
    schema.alterTable('account_roles', (table) => {
      table.dropColumn('reputation')
      table.dropColumn('reputation_actions')
      table.dropColumn('verified_at')
      table.dropColumn('verified_by_id')
      table.dropColumn('verified_note')
      table.dropColumn('proven_at')
    })
  }
}
