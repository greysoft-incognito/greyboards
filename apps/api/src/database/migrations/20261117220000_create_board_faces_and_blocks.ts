import { DB, Migration, SchemaBuilder } from 'arkormx'

/**
 * Each face of a board is booked on its own, with its own rate card. Owners can block
 * days they keep for their own clients. Existing boards get their faces, and their
 * bookings move to the first face.
 */
export default class CreateBoardFacesAndBlocksMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.createTable('board_faces', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('boardId')
        .map('board_id')
        .foreign()
        .references('boards', 'id')
        .onDelete('cascade')
        .as('board')
        .inverseAlias('boardFaces')
      table.integer('position')
      table.string('label')
      table.integer('headingDeg').nullable().map('heading_deg')
      table.bigInteger('rateMinor').nullable().map('rate_minor')
      table.integer('minPeriods').default(1).map('min_periods')
      table.timestamps()
      table.index(['boardId', 'position'])
    })

    schema.createTable('availability_blocks', (table) => {
      table.id('id', 'uuid').primary()
      table
        .uuid('boardId')
        .map('board_id')
        .foreign()
        .references('boards', 'id')
        .onDelete('cascade')
        .as('board')
        .inverseAlias('availabilityBlocks')
      table
        .uuid('faceId')
        .nullable()
        .map('face_id')
        .foreign()
        .references('board_faces', 'id')
        .onDelete('cascade')
        .as('face')
        .inverseAlias('availabilityBlocks')
      table.date('startsOn').map('starts_on')
      table.date('endsOn').map('ends_on')
      table.string('note').nullable()
      table.uuid('createdById').nullable().map('created_by_id')
      table.timestamps()
      table.index(['boardId', 'startsOn'])
    })

    schema.alterTable('bookings', (table) => {
      table.uuid('faceId').nullable().map('face_id')
    })
  }

  public async done(direction: 'up' | 'down'): Promise<void> {
    if (direction !== 'up') return

    await DB.raw('create unique index if not exists board_faces_board_position on board_faces (board_id, position)')
    await DB.raw(
      `insert into board_faces (id, board_id, position, label, heading_deg, min_periods, "createdAt", "updatedAt")
        select gen_random_uuid(), boards.id, n, 'Face ' || chr(64 + n), case when n = 1 then boards.heading_deg end, 1, now(), now()
        from boards cross join generate_series(1, greatest(boards.faces, 1)) as n
        where not exists (select 1 from board_faces where board_faces.board_id = boards.id)`,
    )
    await DB.raw(
      'update bookings set face_id = (select id from board_faces where board_faces.board_id = bookings.board_id and position = 1) where face_id is null',
    )
    await DB.raw('alter table bookings drop constraint if exists bookings_no_overlap')
    await DB.raw(
      `alter table bookings add constraint bookings_no_overlap exclude using gist (face_id with =, daterange(starts_on, ends_on, '[]') with &&) where (status in ('held', 'paid', 'live'))`,
    )
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    await DB.raw('alter table bookings drop constraint if exists bookings_no_overlap')
    await DB.raw(
      `alter table bookings add constraint bookings_no_overlap exclude using gist (board_id with =, daterange(starts_on, ends_on, '[]') with &&) where (status in ('held', 'paid', 'live'))`,
    )

    schema.alterTable('bookings', (table) => {
      table.dropColumn('faceId')
    })
    schema.dropTable('availability_blocks')
    schema.dropTable('board_faces')
  }
}
