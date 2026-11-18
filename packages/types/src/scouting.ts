import type { ID } from './models'

/**
 * Scouts move a prospect through `prospect`, `contacted` and `signed`, or let it go as
 * `lost`. Once its board is tagged it's `captured`, `verified` when listed, `earning` once booked.
 */
export type ProspectStage = 'prospect' | 'contacted' | 'signed' | 'captured' | 'verified' | 'earning' | 'lost'

/** A board a scout spotted and is working on. */
export interface Prospect {
  id: ID
  name: string
  latitude: number
  longitude: number
  address: string | null
  ownerName: string | null
  ownerPhone: string | null
  notes: string | null
  stage: ProspectStage
  /** The board once tagged. Its stage follows the board from then. */
  boardId: ID | null
  stageChangedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ProspectInput {
  name?: string
  latitude?: number
  longitude?: number
  address?: string | null
  ownerName?: string | null
  ownerPhone?: string | null
  notes?: string | null
  /** Only the stages a scout sets by hand. */
  stage?: 'prospect' | 'contacted' | 'signed' | 'lost'
}

export interface ProspectQuery {
  stage?: ProspectStage
  page?: number
  per_page?: number
}

/** An area staff give a scout, as a circle. Without a scout it's open to anyone. */
export interface Territory {
  id: ID
  name: string
  latitude: number
  longitude: number
  radiusM: number
  scout: { id: ID; name: string; email: string } | null
  createdAt: string
}

export interface TerritoryInput {
  name: string
  latitude: number
  longitude: number
  radiusM: number
  /** The scout who holds it, or empty to leave it open. */
  scoutEmail?: string | null
}

export type TaskKind = 'artwork' | 'install' | 'proof' | 'agreement' | 'follow_up'

/** Something to do on a board someone looks after, or in a scout's pipeline. */
export interface Task {
  kind: TaskKind
  title: string
  detail: string
  dueOn: string | null
  bookingId: ID | null
  boardId: ID | null
  prospectId: ID | null
}
