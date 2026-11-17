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

/**
 * A board owner, with or without an account. Scouts make one the first time they tag an
 * owner's board; the owner claims it later by proving the phone number. One account can
 * manage several.
 */
export interface OwnerProfile {
  id: ID
  name: string
  phone: string | null
  /** Whether an account manages it. */
  claimed: boolean
  userId: ID | null
  phoneVerifiedAt: string | null
  createdAt: string
}

/** An owner offered while typing a name when tagging a board. The number is mostly hidden. */
export interface OwnerSuggestion {
  id: ID
  name: string
  phone: string | null
  claimed: boolean
  /** Boards already under this owner. */
  boards: number
}

/** `expired` is a sent agreement whose link ran out before the owner signed. */
export type BoardAgreementStatus = 'sent' | 'signed' | 'declined' | 'cancelled' | 'expired'

/** The agreement a board owner signs by SMS when a scout runs their board, as the scout and reviewers see it. */
export interface BoardAgreement {
  id: ID
  status: BoardAgreementStatus
  ownerName: string | null
  ownerPhone: string
  /** The owner's part of each booking, in percent, as it was when the agreement was sent. */
  ownerSharePercent: number
  rate: BoardRate | null
  sendCount: number
  lastSentAt: string
  /** Seconds until the link can be texted again, while it is waiting. */
  resendInSeconds: number | null
  expiresAt: string
  signedName: string | null
  signedAt: string | null
  declinedAt: string | null
  createdAt: string
}

/** An agreement as the owner reads it from the link in their SMS. */
export interface AgreementOffer {
  status: BoardAgreementStatus
  ownerName: string | null
  /** Mostly hidden, such as +234••••••0000. */
  ownerPhone: string
  ownerSharePercent: number
  rate: BoardRate | null
  expiresAt: string
  signedName: string | null
  signedAt: string | null
  scout: { name: string; avatarUrl: string | null } | null
  board: Pick<Board, 'name' | 'kindLabel' | 'widthM' | 'heightM' | 'faces' | 'lit' | 'address' | 'city' | 'latitude' | 'longitude' | 'coverUrl'>
}

/** A board with its photos. The owner, agreement and review notes come only to whoever looks after it and reviewers. */
export interface BoardDetail extends Board {
  photos: BoardPhoto[]
  owner?: OwnerProfile | null
  taggedById?: ID | null
  reviewNote?: string | null
  reviewedAt?: string | null
  /** For boards a scout runs for their owner. */
  agreement?: BoardAgreement | null
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
}

/** Who owns a board being tagged: a suggested or managed profile, or a new owner's name and phone. */
export interface BoardOwnerChoice {
  ownerProfileId?: ID | null
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
