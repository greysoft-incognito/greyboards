import { createHash, randomBytes } from 'node:crypto'
import { abortIf } from '@arkstack/common'
import { DB } from 'arkormx'
import { Board } from '@app/models/Board'
import { Booking, type BookingStatus } from '@app/models/Booking'
import { Day } from '@app/support/Day'
import { Settings } from '@app/support/Settings'
import { DigitalSlots } from './DigitalSlots'

/** One play a screen's player reports. */
export interface PlayInput {
  bookingId: string
  playedAt: string
  durationMs: number
}

/**
 * The software running a digital screen. It signs in with a token the owner makes on the
 * board's page, fetches the day's schedule (which ads, in which slots, at which hours), and
 * reports each play. The plays show on each booking, as proof the ad ran.
 */
export class ScreenPlayer {
  /** Bookings that play on a screen: paid or live, with approved artwork. */
  static readonly PLAYING: BookingStatus[] = ['paid', 'live', 'completed']

  /** Make a new token for the screen's player. It shows once; any older token stops working. */
  static async issue(board: Board): Promise<string> {
    abortIf(!board.isDigital(), 'Only digital screens have a player.', 422)

    const token = `gbp_${randomBytes(24).toString('base64url')}`

    await board.update({ playerTokenHash: ScreenPlayer.hash(token), playerSeenAt: null })

    return token
  }

  static async revoke(board: Board): Promise<void> {
    await board.update({ playerTokenHash: null, playerSeenAt: null })
  }

  /** The screen a player's `Authorization: Bearer` token belongs to, noting that it checked in. */
  static async boardFor(header: string | undefined): Promise<Board> {
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : ''
    const board = token.startsWith('gbp_') ? await Board.query().where({ playerTokenHash: ScreenPlayer.hash(token) }).first() : null

    abortIf(!board, 'Unknown player token. Make a new one on the board’s page.', 401)

    await board!.update({ playerSeenAt: new Date() })

    return board!
  }

  /** What plays on the screen on `day`: each booking's slots, hours and artwork. */
  static async schedule(board: Board, day: string) {
    const loop = await DigitalSlots.loop(board)
    const bookings = await Booking.query()
      .where({ boardId: board.id, artworkStatus: 'approved' })
      .whereIn('status', ['paid', 'live'])
      .whereRaw('starts_on <= ? and ends_on >= ?', [day, day])
      .oldest('slotStart')
      .get()

    return {
      day,
      loop,
      bookings: await Promise.all(
        bookings.all().map(async (booking) => ({
          bookingId: booking.id,
          faceId: booking.faceId,
          slotStart: booking.slotStart,
          slots: booking.slots,
          daypart: booking.daypart,
          hourFrom: booking.hourFrom,
          hourTo: booking.hourTo,
          startsOn: Day.of(booking.startsOn),
          endsOn: Day.of(booking.endsOn),
          artworkUrl: await booking.artworkUrl(),
        })),
      ),
    }
  }

  /**
   * Keep the plays a player sent. A play counts only for a booking on this screen, on a day
   * it runs; the rest are skipped. A play sent twice is kept once.
   */
  static async record(board: Board, plays: PlayInput[]): Promise<{ accepted: number; skipped: number }> {
    const most = await Settings.number('digital.max_plays_per_request')

    abortIf(plays.length > most, `Send up to ${most} plays at a time.`, 422)

    const ids = [...new Set(plays.map((play) => String(play.bookingId)))].filter((id) => /^[0-9a-f-]{36}$/i.test(id))
    const bookings = ids.length
      ? (await Booking.query().where({ boardId: board.id }).whereIn('id', ids).whereIn('status', ScreenPlayer.PLAYING).get()).all()
      : []
    const runs = new Map(bookings.map((booking) => [booking.id, booking]))
    const kept = plays.filter((play) => {
      const booking = runs.get(play.bookingId)
      const played = new Date(play.playedAt)

      if (!booking || Number.isNaN(played.getTime()) || played.getTime() > Date.now() + 5 * 60_000) return false

      const day = played.toISOString().slice(0, 10)

      return day >= Day.of(booking.startsOn) && day <= Day.of(booking.endsOn)
    })

    for (const play of kept) {
      const booking = runs.get(play.bookingId)!

      await DB.raw(
        `insert into play_logs (id, booking_id, board_id, face_id, played_at, duration_ms, "createdAt", "updatedAt")
         values (gen_random_uuid(), ?, ?, ?, ?, ?, now(), now()) on conflict (booking_id, played_at) do nothing`,
        [booking.id, board.id, booking.faceId, new Date(play.playedAt).toISOString(), Math.max(0, Math.round(play.durationMs))],
      )
    }

    return { accepted: kept.length, skipped: plays.length - kept.length }
  }

  /** How often a booking's ad played: in all, and on each of its last 31 days of plays. */
  static async summary(booking: Booking) {
    const totals = (
      await DB.raw<{ plays: string | number; ms: string | number | null; last: Date | null }>(
        'select count(*) as plays, sum(duration_ms) as ms, max(played_at) as last from play_logs where booking_id = ?',
        [booking.id],
      )
    ).all()[0]
    const days = (
      await DB.raw<{ day: Date | string; plays: string | number; ms: string | number | null }>(
        `select (played_at at time zone 'UTC')::date as day, count(*) as plays, sum(duration_ms) as ms
         from play_logs where booking_id = ? group by 1 order by 1 desc limit 31`,
        [booking.id],
      )
    ).all()

    return {
      total: Number(totals?.plays ?? 0),
      seconds: Math.round(Number(totals?.ms ?? 0) / 1000),
      lastPlayedAt: totals?.last ?? null,
      days: days.map((row) => ({ day: Day.of(row.day), plays: Number(row.plays), seconds: Math.round(Number(row.ms ?? 0) / 1000) })).reverse(),
    }
  }

  private static hash(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }
}
