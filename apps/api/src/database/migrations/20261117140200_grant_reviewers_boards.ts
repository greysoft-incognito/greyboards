import { DB, Migration } from 'arkormx'

/** Reviewers also check the boards scouts and owners tag, before they go on the map. */
export default class GrantReviewersBoardsMigration extends Migration {
  public async up(): Promise<void> {}

  public async down(): Promise<void> {}

  public async done(direction: 'up' | 'down'): Promise<void> {
    await DB.raw(
      direction === 'up'
        ? `update roles set permissions = permissions::jsonb || '["boards.review"]'::jsonb where slug = 'reviewer' and not permissions::jsonb ? 'boards.review'`
        : `update roles set permissions = permissions::jsonb - 'boards.review' where slug = 'reviewer'`,
    )
  }
}
