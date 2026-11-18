import { DB, Migration, SchemaBuilder } from 'arkormx'

/**
 * Digital screens sell slots in a loop instead of the whole face. A booking takes a run of
 * slots (`slot_start` for `slots`) during part of the day (`hour_from` to `hour_to`), so the
 * overlap rule now compares slots and hours as well as days. A static booking takes the one
 * slot all day, which keeps the old rule for static boards. A screen's player logs each play.
 */
export default class AddDigitalSlotsMigration extends Migration {
  public async up(schema: SchemaBuilder): Promise<void> {
    schema.alterTable('boards', (table) => {
      table.integer('loopSlots').nullable().map('loop_slots')
      table.integer('slotSeconds').nullable().map('slot_seconds')
      table.string('playerTokenHash').nullable().map('player_token_hash')
      table.timestamp('playerSeenAt').nullable().map('player_seen_at')
    })

    schema.alterTable('bookings', (table) => {
      table.integer('slotStart').default(0).map('slot_start')
      table.integer('slots').default(1)
      table.string('daypart').default('all_day')
      table.integer('hourFrom').default(0).map('hour_from')
      table.integer('hourTo').default(24).map('hour_to')
    })

    schema.createTable('play_logs', (table) => {
      table.id('id', 'uuid').primary()
      table.uuid('bookingId').map('booking_id')
      table.uuid('boardId').map('board_id')
      table.uuid('faceId').nullable().map('face_id')
      table.timestamp('playedAt').map('played_at')
      table.integer('durationMs').map('duration_ms')
      table.timestamps()
      table.index(['bookingId', 'playedAt'])
    })
  }

  public async down(schema: SchemaBuilder): Promise<void> {
    schema.dropTable('play_logs')
    schema.alterTable('bookings', (table) => {
      table.dropColumn('slotStart')
      table.dropColumn('slots')
      table.dropColumn('daypart')
      table.dropColumn('hourFrom')
      table.dropColumn('hourTo')
    })
    schema.alterTable('boards', (table) => {
      table.dropColumn('loopSlots')
      table.dropColumn('slotSeconds')
      table.dropColumn('playerTokenHash')
      table.dropColumn('playerSeenAt')
    })
  }

  public async done(direction: 'up' | 'down'): Promise<void> {
    await DB.raw('alter table bookings drop constraint if exists bookings_no_overlap')

    if (direction === 'up') {
      await DB.raw(
        `alter table bookings add constraint bookings_no_overlap exclude using gist (face_id with =, daterange(starts_on, ends_on, '[]') with &&, int4range(slot_start, slot_start + slots) with &&, int4range(hour_from, hour_to) with &&) where (status in ('held', 'paid', 'live'))`,
      )
      await DB.raw('create unique index if not exists play_logs_once on play_logs (booking_id, played_at)')
      await DB.raw('create unique index if not exists boards_player_token on boards (player_token_hash) where player_token_hash is not null')
    } else {
      await DB.raw(
        `alter table bookings add constraint bookings_no_overlap exclude using gist (face_id with =, daterange(starts_on, ends_on, '[]') with &&) where (status in ('held', 'paid', 'live'))`,
      )
    }
  }
}
