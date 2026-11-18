import { abortIf } from '@arkstack/common'
import { raw } from 'arkormx'
import { Board } from '@app/models/Board'
import { Prospect, type ProspectStage } from '@app/models/Prospect'
import { Territory } from '@app/models/Territory'
import type { User } from '@app/models/User'
import { Settings } from '@app/support/Settings'
import { Sms } from '@app/support/Sms'

export interface ProspectInput {
  name?: string
  latitude?: number
  longitude?: number
  address?: string | null
  ownerName?: string | null
  ownerPhone?: string | null
  notes?: string | null
  stage?: ProspectStage
}

/** A circle with nobody else's claim inside, from a point and how far it reaches. */
const POINT_WITHIN = 'ST_DWithin(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography'

/**
 * The scout pipeline. A scout records boards they spot as prospects and moves each along
 * as they talk to the owner; once they tag the board, the board decides the rest. A
 * prospect someone is working keeps other scouts off its board and its owner for a while,
 * and when territories are enforced, scouts work only their own areas and open ones.
 */
export class Pipeline {
  /** The scout's prospects, with each one's stage worked out. */
  static of(scout: User, stage?: ProspectStage | null) {
    const query = Prospect.query().where({ scoutId: scout.id }).addSelect({ current_stage: raw(Prospect.STAGE_SQL) })

    if (stage) query.whereRaw(`${Prospect.STAGE_SQL} = ?`, [stage])

    return query.latest('updatedAt')
  }

  /** How many of the scout's prospects sit at each stage. */
  static async counts(scout: User): Promise<Record<ProspectStage, number>> {
    const entries = await Promise.all(Prospect.STAGES.map(async (stage) => [stage, await Prospect.query().where({ scoutId: scout.id }).whereRaw(`${Prospect.STAGE_SQL} = ?`, [stage]).count()] as const))

    return Object.fromEntries(entries) as Record<ProspectStage, number>
  }

  static async create(scout: User, input: Required<Pick<ProspectInput, 'name' | 'latitude' | 'longitude'>> & ProspectInput): Promise<Prospect> {
    const phone = input.ownerPhone ? Sms.normalize(input.ownerPhone) : null

    await Pipeline.checkClaims(scout, input.latitude, input.longitude, phone, null)

    return Prospect.query().create({
      scoutId: scout.id,
      name: input.name.trim(),
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address?.trim() || null,
      ownerName: input.ownerName?.trim() || null,
      ownerPhone: phone,
      notes: input.notes?.trim() || null,
      stage: input.stage && Prospect.MANUAL.includes(input.stage) ? input.stage : 'prospect',
      stageChangedAt: new Date(),
    })
  }

  /** Change what the scout knows, or move it along by hand. A tagged board's stage comes from the board, short of letting it go. */
  static async update(prospect: Prospect, scout: User, input: ProspectInput): Promise<Prospect> {
    const moved = input.latitude !== undefined || input.longitude !== undefined
    const phone = input.ownerPhone === undefined ? prospect.ownerPhone : input.ownerPhone ? Sms.normalize(input.ownerPhone) : null
    const stage = input.stage ?? prospect.stage

    abortIf(!Prospect.MANUAL.includes(stage), 'Captured, verified and earning follow the board. Tag it to move it on.', 422)
    abortIf(!!prospect.boardId && stage !== prospect.stage && stage !== 'lost' && prospect.stage !== 'lost', 'This board is tagged, so its stage follows the board.', 422)

    if (moved || phone !== prospect.ownerPhone || (prospect.stage === 'lost' && stage !== 'lost')) {
      await Pipeline.checkClaims(scout, input.latitude ?? prospect.latitude, input.longitude ?? prospect.longitude, phone, prospect.id)
    }

    await prospect.update({
      name: input.name?.trim() || prospect.name,
      latitude: input.latitude ?? prospect.latitude,
      longitude: input.longitude ?? prospect.longitude,
      address: input.address === undefined ? prospect.address : input.address?.trim() || null,
      ownerName: input.ownerName === undefined ? prospect.ownerName : input.ownerName?.trim() || null,
      ownerPhone: phone,
      notes: input.notes === undefined ? prospect.notes : input.notes?.trim() || null,
      stage,
      stageChangedAt: stage === prospect.stage ? prospect.stageChangedAt : new Date(),
    })

    return prospect
  }

  /** Link the board the scout tagged for this prospect. Its stage follows the board from here. */
  static async link(prospect: Prospect, scout: User, boardId: string): Promise<Prospect> {
    const board = await Board.query().find(boardId)

    abortIf(!board || board.taggedById !== scout.id, 'Link a board you tagged.', 422)
    abortIf(await Prospect.query().where({ boardId }).whereRaw('id <> ?', [prospect.id]).exists(), 'Another prospect already has this board.', 422)

    await prospect.update({ boardId, stage: prospect.stage === 'lost' ? 'signed' : prospect.stage, stageChangedAt: new Date() })

    return prospect
  }

  /** A scout tagged a board: the nearest open prospect of theirs at that spot is captured. */
  static async tagged(board: Board, scout: User): Promise<void> {
    const radius = await Settings.number('scouting.claim_radius_m')
    const prospect = await Prospect.query()
      .where({ scoutId: scout.id })
      .whereNull('boardId')
      .whereRaw("stage <> 'lost'")
      .whereRaw(`${POINT_WITHIN}, ?)`, [board.longitude, board.latitude, radius])
      .latest('updatedAt')
      .first()

    if (prospect) await prospect.update({ boardId: board.id, stageChangedAt: new Date() })
  }

  /** Territories that hold `point`, the scout's own or open, and whose they are. */
  static territoriesAt(latitude: number, longitude: number) {
    return Territory.query().whereRaw(`${POINT_WITHIN}, radius_m)`, [longitude, latitude]).limit(20).get()
  }

  /**
   * Stop a scout working a board or owner someone else is already on: another scout's live
   * prospect at the same spot or with the same owner's phone, a board already on Greyboards
   * there, or, when territories are enforced, another scout's territory.
   */
  private static async checkClaims(scout: User, latitude: number, longitude: number, phone: string | null, exceptId: string | null): Promise<void> {
    const radius = await Settings.number('scouting.claim_radius_m')
    const days = await Settings.number('scouting.claim_days')
    const others = () =>
      Prospect.query()
        .whereRaw('scout_id <> ?', [scout.id])
        .whereRaw("stage <> 'lost'")
        .whereRaw('"updatedAt" > now() - make_interval(days => ?)', [days])
        .when(!!exceptId, (query) => query.whereRaw('id <> ?', [exceptId]))

    abortIf(await others().whereRaw(`${POINT_WITHIN}, ?)`, [longitude, latitude, radius]).exists(), 'Another scout is already working a board here.', 409)
    abortIf(!!phone && (await others().where({ ownerPhone: phone }).exists()), 'Another scout is already talking to this owner.', 409)
    abortIf(await Board.query().whereRaw(`${POINT_WITHIN}, ?)`, [longitude, latitude, radius]).whereRaw('(tagged_by_id is null or tagged_by_id <> ?)', [scout.id]).exists(), 'There’s already a board on Greyboards here.', 409)

    if (!(await Settings.get('scouting.enforce_territories'))) return

    const territories = (await Pipeline.territoriesAt(latitude, longitude)).all()
    const held = territories.filter((territory) => territory.scoutId)

    abortIf(held.length > 0 && !held.some((territory) => territory.scoutId === scout.id), 'This spot is in another scout’s territory.', 409)
  }
}
