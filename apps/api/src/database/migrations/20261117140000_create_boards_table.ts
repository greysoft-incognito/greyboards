import { DB, Migration, SchemaBuilder } from 'arkormx'

export default class CreateBoardsTableMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('boards', (table) => {
      table.id('id', 'uuid').primary()
      table.string('name')
      table.text('description').nullable()
      table.string('kind')
      table.float('widthM').map('width_m')
      table.float('heightM').map('height_m')
      table.integer('faces').default(1)
      table.string('facing').nullable()
      table.boolean('lit').default(false)
      table.string('address').nullable()
      table.string('city').nullable()
      table.string('country').nullable()
      table.float('latitude')
      table.float('longitude')
      table.float('accuracyM').nullable().map('accuracy_m')
      table.bigInteger('rateMinor').nullable().map('rate_minor')
      table.string('currency').default('NGN')
      table.string('ratePeriod').default('month').map('rate_period')
      table.string('status')
      table.string('reviewNote').nullable().map('review_note')
      table.string('ownerName').nullable().map('owner_name')
      table.string('ownerPhone').nullable().map('owner_phone')
      table
        .uuid('ownerId')
        .nullable()
        .map('owner_id')
        .foreign()
        .references('users', 'id')
        .onDelete('setNull')
        .as('owner')
        .inverseAlias('ownedBoards')
      table
        .uuid('taggedById')
        .nullable()
        .map('tagged_by_id')
        .foreign()
        .references('users', 'id')
        .onDelete('setNull')
        .as('tagger')
        .inverseAlias('taggedBoards')
      table
        .uuid('reviewedById')
        .nullable()
        .map('reviewed_by_id')
        .foreign()
        .references('users', 'id')
        .onDelete('setNull')
        .as('reviewer')
        .inverseAlias('reviewedBoards')
      table.timestamp('reviewedAt').nullable().map('reviewed_at')
      table.timestamps()
      table.index(['status', 'latitude', 'longitude'])
      table.index(['ownerId'])
      table.index(['taggedById'])
    })
  }

  /** A PostGIS point kept in step with latitude and longitude, for distance searches. */
  public async done(direction: 'up' | 'down'): Promise<void> {
    if (direction !== 'up') return

    await DB.raw(
      `alter table boards add column if not exists location geography(Point, 4326)
        generated always as (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) stored`,
    )
    await DB.raw('create index if not exists boards_location_gist on boards using gist (location)')
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('boards')
  }
}
