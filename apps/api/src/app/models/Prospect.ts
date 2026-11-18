import { Model } from '@arkstack/database'

/**
 * Where a prospect is. Scouts move it through `prospect`, `contacted` and `signed`, or let
 * it go as `lost`. Once its board is tagged it's `captured`, then `verified` when listed
 * and `earning` once booked; those three come from the board.
 */
export type ProspectStage = 'prospect' | 'contacted' | 'signed' | 'captured' | 'verified' | 'earning' | 'lost'

/** A board a scout spotted and is working on, before and after it's on Greyboards. */
export class Prospect extends Model {
  static readonly STAGES: ProspectStage[] = ['prospect', 'contacted', 'signed', 'captured', 'verified', 'earning', 'lost']

  /** The stages a scout sets by hand. */
  static readonly MANUAL: ProspectStage[] = ['prospect', 'contacted', 'signed', 'lost']

  /**
   * The stage as SQL: the scout's own until the board is tagged, then from the board. The
   * one place the board's stages are worked out, for lists, filters and counts alike.
   */
  static readonly STAGE_SQL = `(case
    when prospects.board_id is null then prospects.stage
    when exists (select 1 from bookings where bookings.board_id = prospects.board_id and bookings.status in ('paid', 'live', 'completed')) then 'earning'
    when exists (select 1 from boards where boards.id = prospects.board_id and boards.status = 'listed') then 'verified'
    else 'captured' end)`

  declare id: string
  declare scoutId: string
  declare name: string
  declare latitude: number
  declare longitude: number
  declare address: string | null
  declare ownerName: string | null
  declare ownerPhone: string | null
  declare notes: string | null
  declare stage: ProspectStage
  declare boardId: string | null
  declare stageChangedAt: Date | null
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'prospects'

  protected static override columns = {
    scoutId: 'scout_id',
    ownerName: 'owner_name',
    ownerPhone: 'owner_phone',
    boardId: 'board_id',
    stageChangedAt: 'stage_changed_at',
  }

  protected override casts = {
    latitude: 'number',
    longitude: 'number',
  } as never
}
