import type { AdminUser } from './admin'
import type { PageQuery } from './api'
import type { ID } from './models'

/** The kinds of board the map knows. */
export type BoardKind = 'billboard' | 'unipole' | 'gantry' | 'wall' | 'digital' | 'street_pole' | 'bus_shelter'

/** Tagged boards start pending until a reviewer lists or rejects them. */
export type BoardStatus = 'pending' | 'listed' | 'rejected' | 'unlisted'

export type BoardRatePeriod = 'week' | 'month'

export interface BoardKindDefinition {
  kind: BoardKind
  label: string
}

/** What a board costs, in minor units (kobo for NGN). */
export interface BoardRate {
  amountMinor: number
  currency: string
  period: BoardRatePeriod
}

/** A board as anyone may see it. */
export interface Board {
  id: ID
  name: string
  description: string | null
  kind: BoardKind
  kindLabel: string
  widthM: number
  heightM: number
  faces: number
  facing: string | null
  lit: boolean
  address: string | null
  city: string | null
  country: string | null
  latitude: number
  longitude: number
  rate: BoardRate | null
  status: BoardStatus
  /** Metres from the search point, on a nearby search. */
  distanceM: number | null
  coverUrl: string | null
  createdAt: string
}

export interface BoardPhoto {
  id: ID
  url: string
  width: number
  height: number
  latitude: number | null
  longitude: number | null
  accuracyM: number | null
  /** Metres from the board, shown to whoever looks after it. */
  distanceM: number | null
  takenAt: string | null
  createdAt: string
}

/** A board with its photos. The owner's contact and review notes come only to its owner, tagger and reviewers. */
export interface BoardDetail extends Board {
  photos: BoardPhoto[]
  ownerName?: string | null
  ownerPhone?: string | null
  ownerId?: ID | null
  taggedById?: ID | null
  reviewNote?: string | null
  reviewedAt?: string | null
}

export interface AdminBoard extends BoardDetail {
  tagger: AdminUser | null
}

/** What the tag-a-board form sends. */
export interface BoardInput {
  name: string
  description?: string | null
  kind: BoardKind
  widthM: number
  heightM: number
  faces?: number | null
  facing?: string | null
  lit?: boolean
  address?: string | null
  city?: string | null
  /** Two-letter country code. */
  country?: string | null
  latitude: number
  longitude: number
  accuracyM?: number | null
  rateMinor?: number | null
  currency?: string | null
  ratePeriod?: BoardRatePeriod | null
  /** Scouts note who owns the board so we can reach them. */
  ownerName?: string | null
  ownerPhone?: string | null
}

/** Listed boards inside the map's bounds, or near a point (nearest first). */
export interface BoardSearch extends PageQuery {
  west?: number
  south?: number
  east?: number
  north?: number
  lat?: number
  lng?: number
  radiusKm?: number
  kind?: BoardKind
}

/** Where the phone was when a board photo was taken. */
export interface BoardPhotoLocation {
  latitude?: number | null
  longitude?: number | null
  accuracyM?: number | null
  takenAt?: string | null
}

export interface BoardReview {
  status: 'listed' | 'rejected' | 'unlisted'
  note?: string | null
}
