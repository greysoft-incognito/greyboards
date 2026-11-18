import type { AccountRoleKind, ID } from './models'

/**
 * How far someone can be trusted in one role, as other people see it. `verified`: Greyboards
 * staff checked them by hand. `proven`: the role reached the reputation milestones.
 */
export interface RoleStanding {
  kind: AccountRoleKind
  score: number
  verified: boolean
  proven: boolean
}

/** How far a role is from the proven badge. */
export interface ProvenProgress {
  score: { have: number; need: number }
  actions: { have: number; need: number }
  days: { have: number; need: number }
}

/** A role's reputation, for the account and staff. */
export interface RoleReputation extends RoleStanding {
  /** Checked actions that added to the score. */
  actions: number
  verifiedAt: string | null
  provenAt: string | null
  progress: ProvenProgress
}

export type BadgeKey = 'verified' | 'proven'

/** A badge and what it means, so anyone who sees it can read why it is there. */
export interface BadgeDisclosure {
  key: BadgeKey
  label: string
  summary: string
  description: string
}

export type ReputationAction = 'posted' | 'signed' | 'hosted' | 'campaign' | 'missed' | 'adjusted'

/** What earns or costs points, and for which roles. */
export interface ReputationRule {
  action: Exclude<ReputationAction, 'adjusted'>
  roles: AccountRoleKind[]
  label: string
  /** Negative when it costs points. */
  points: number
}

export interface ReputationDisclosure {
  badges: BadgeDisclosure[]
  rules: ReputationRule[]
}

/** One change to a role's score. */
export interface ReputationEvent {
  id: ID
  action: ReputationAction
  label: string
  points: number
  /** Staff's reason, for corrections. */
  note: string | null
  /** The booking, board or print job it was for. */
  subjectId: ID | null
  createdAt: string
}

/** Staff add or take points by hand, with the reason. */
export interface ReputationAdjustment {
  points: number
  note: string
}
