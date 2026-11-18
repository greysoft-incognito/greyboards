import { Model } from '@arkstack/database'
import type { QueryBuilder } from 'arkormx'
import type { AccountRoleKind } from './AccountRole'

/**
 * `posted`: put up an ad whose proof was accepted. `signed`: an owner signed the scout's
 * agreement. `hosted`: a checked campaign ran on the board. `campaign`: the advertiser's
 * campaign went up and was checked. `missed`: a dispatcher lost a print job. `adjusted`:
 * staff corrected the score.
 */
export type ReputationAction = 'posted' | 'signed' | 'hosted' | 'campaign' | 'missed' | 'adjusted'

/** One change to a role's reputation, with what earned or cost it. */
export class ReputationEvent extends Model {
  declare id: string
  declare accountRoleId: string
  declare userId: string
  declare kind: AccountRoleKind
  declare action: ReputationAction
  declare points: number
  /** The booking, board or print job it was for. Each subject counts once per action. */
  declare subjectId: string | null
  declare note: string | null
  declare createdById: string | null
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'reputation_events'

  protected static override columns = {
    accountRoleId: 'account_role_id',
    userId: 'user_id',
    subjectId: 'subject_id',
    createdById: 'created_by_id',
  }

  protected override casts = {
    points: 'number',
  } as never

  scopeOfRole(query: QueryBuilder<ReputationEvent>, accountRoleId: string): QueryBuilder<ReputationEvent> {
    return query.where({ accountRoleId })
  }
}
