import { abortIf } from '@arkstack/common'
import { DB } from 'arkormx'
import type { Board } from '@app/models/Board'
import type { BoardFace } from '@app/models/BoardFace'
import { Booking } from '@app/models/Booking'
import { Day } from '@app/support/Day'
import { Settings } from '@app/support/Settings'

/** The part of the day a digital booking plays in. */
export type Daypart = 'all_day' | 'morning' | 'afternoon' | 'evening'

/** What a digital booking takes: a run of slots in the loop, for part of the day. */
export interface SlotPick {
  slotStart: number
  slots: number
  daypart: Daypart
  hourFrom: number
  hourTo: number
}

/** A day range in which no slot is free in any part of the day. */
interface FullDays {
  startsOn: string
  endsOn: string
}

/**
 * Digital screens sell slots in a loop instead of the whole face, all day or for part of it.
 * A booking takes a run of slots next to each other; the database refuses two bookings that
 * share a slot, a day and an hour. The rate on a screen is for one slot, all day.
 */
export class DigitalSlots {
  static readonly DAYPARTS: Daypart[] = ['all_day', 'morning', 'afternoon', 'evening']

  /** The hours each part of the day covers, from and up to. */
  static readonly HOURS: Record<Daypart, [number, number]> = {
    all_day: [0, 24],
    morning: [6, 12],
    afternoon: [12, 18],
    evening: [18, 24],
  }

  /** What a booking that isn't on a screen takes: its one slot, all day. */
  static readonly WHOLE: SlotPick = { slotStart: 0, slots: 1, daypart: 'all_day', hourFrom: 0, hourTo: 24 }

  /** The screen's loop: how many slots, and how long each plays. */
  static async loop(board: Board): Promise<{ slots: number; seconds: number }> {
    return {
      slots: board.loopSlots ?? (await Settings.number('digital.loop_slots')),
      seconds: board.slotSeconds ?? (await Settings.number('digital.slot_seconds')),
    }
  }

  /** What part of the day costs, as a percent of the all-day price. */
  static async percent(daypart: Daypart): Promise<number> {
    return daypart === 'all_day' ? 100 : Settings.number(`digital.${daypart}_percent`)
  }

  /** The price for one period of `slots` slots in part of the day, from the face's all-day rate per slot. */
  static async price(board: Board, face: BoardFace, slots: number, daypart: Daypart): Promise<number> {
    return Math.round((board.rateFor(face) ?? 0) * slots * (await DigitalSlots.percent(daypart)) / 100)
  }

  /** Every part of the day with its price for one slot, for the booking form. */
  static async prices(board: Board, face: BoardFace) {
    return Promise.all(
      DigitalSlots.DAYPARTS.map(async (daypart) => ({
        daypart,
        hours: DigitalSlots.HOURS[daypart],
        percent: await DigitalSlots.percent(daypart),
        rateMinor: await DigitalSlots.price(board, face, 1, daypart),
      })),
    )
  }

  /**
   * Find room for `slots` slots next to each other in part of the day, free on every day from
   * `startsOn` to `endsOn`. Refuses when the screen has fewer slots, or none are free.
   */
  static async pick(board: Board, face: BoardFace, startsOn: string, endsOn: string, slots: number, daypart: Daypart): Promise<SlotPick> {
    const loop = await DigitalSlots.loop(board)
    const [hourFrom, hourTo] = DigitalSlots.HOURS[daypart]

    abortIf(!DigitalSlots.DAYPARTS.includes(daypart), 'Choose all day, morning, afternoon or evening.', 422)
    abortIf(slots < 1 || slots > loop.slots, `This screen has ${loop.slots} slot${loop.slots === 1 ? '' : 's'} in its loop.`, 422)

    const start = DigitalSlots.firstFree(await DigitalSlots.used(face, startsOn, endsOn, hourFrom, hourTo), loop.slots, slots)

    abortIf(start === null, 'Not enough slots are free. Try fewer slots, a different time of day or other dates.', 409)

    return { slotStart: start!, slots, daypart, hourFrom, hourTo }
  }

  /** The most slots next to each other still free for a part of the day on every day from `startsOn` to `endsOn`. */
  static async freeRun(board: Board, face: BoardFace, startsOn: string, endsOn: string, daypart: Daypart): Promise<number> {
    const loop = await DigitalSlots.loop(board)
    const [hourFrom, hourTo] = DigitalSlots.HOURS[daypart]
    const used = await DigitalSlots.used(face, startsOn, endsOn, hourFrom, hourTo)
    let longest = 0
    let run = 0

    for (let slot = 0; slot < loop.slots; slot++) {
      run = used.has(slot) ? 0 : run + 1
      longest = Math.max(longest, run)
    }

    return longest
  }

  /**
   * Days with no slot free in any part of the day, as runs of days, for the screen's calendar.
   * A day with any room left stays open, and the booking form says how much.
   */
  static async fullDays(board: Board, face: BoardFace, from: string, to: string): Promise<FullDays[]> {
    const loop = await DigitalSlots.loop(board)
    const bookings = (await DigitalSlots.overlapping(face, from, to, 0, 24).limit(500).get()).all()
    const runs: FullDays[] = []

    if (!bookings.length) return runs

    for (let day = from; day <= to; day = Day.addDays(day, 1)) {
      const today = bookings.filter((booking) => Day.of(booking.startsOn) <= day && Day.of(booking.endsOn) >= day)
      const full = today.length > 0 && DigitalSlots.noRoom(today, loop.slots)

      if (!full) continue

      const last = runs[runs.length - 1]

      if (last && Day.addDays(last.endsOn, 1) === day) last.endsOn = day
      else runs.push({ startsOn: day, endsOn: day })
    }

    return runs
  }

  /** Refuse a smaller loop than the slots bookings still to run already take. */
  static async checkLoop(board: Board, loopSlots: number | null): Promise<void> {
    if (!board.isDigital()) return

    const rows = await DB.raw<{ used: number | string | null }>(
      `select max(slot_start + slots) as used from bookings where board_id = ? and status in ('held', 'paid', 'live') and ends_on >= current_date`,
      [board.id],
    )
    const used = Number(rows.all()[0]?.used ?? 0)
    const wanted = loopSlots ?? (await Settings.number('digital.loop_slots'))

    abortIf(wanted < used, `Bookings still to run use ${used} slots, so the loop needs at least ${used}.`, 422)
  }

  /** Whether every slot is taken in every part of the day by `bookings`, all on one day. */
  private static noRoom(bookings: Booking[], loopSlots: number): boolean {
    const parts = DigitalSlots.DAYPARTS.filter((daypart) => daypart !== 'all_day')

    for (let slot = 0; slot < loopSlots; slot++) {
      for (const daypart of parts) {
        const [from, to] = DigitalSlots.HOURS[daypart]
        const taken = bookings.some((booking) => booking.slotStart <= slot && slot < booking.slotStart + booking.slots && booking.hourFrom < to && booking.hourTo > from)

        if (!taken) return false
      }
    }

    return true
  }

  /** The slots other bookings take on any of the days, in any of the hours. */
  private static async used(face: BoardFace, startsOn: string, endsOn: string, hourFrom: number, hourTo: number): Promise<Set<number>> {
    await Booking.expireHolds()

    const used = new Set<number>()

    for (const booking of (await DigitalSlots.overlapping(face, startsOn, endsOn, hourFrom, hourTo).get()).all()) {
      for (let slot = booking.slotStart; slot < booking.slotStart + booking.slots; slot++) used.add(slot)
    }

    return used
  }

  private static overlapping(face: BoardFace, startsOn: string, endsOn: string, hourFrom: number, hourTo: number) {
    return Booking.query()
      .where({ faceId: face.id })
      .whereIn('status', Booking.TAKING)
      .whereRaw('ends_on >= ? and starts_on <= ? and hour_from < ? and hour_to > ?', [startsOn, endsOn, hourTo, hourFrom])
  }

  /** The first of `count` free slots next to each other, or null. */
  private static firstFree(used: Set<number>, loopSlots: number, count: number): number | null {
    for (let start = 0; start + count <= loopSlots; start++) {
      let free = true

      for (let slot = start; slot < start + count && free; slot++) free = !used.has(slot)

      if (free) return start
    }

    return null
  }
}
