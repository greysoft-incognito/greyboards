import type { AdminUser } from './admin'
import type { PageQuery } from './api'
import type { BoardBookingTerms } from './bookings'
import type { DuplicateBoard } from './partners'
import type { ID } from './models'
import type { RoleStanding } from './reputation'
import type { RatingSummary } from './reviews'

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
  /** Compass direction the board's face points, 0 to 359 from true north. */
  headingDeg: number | null
  lit: boolean
  address: string | null
  city: string | null
  country: string | null
  latitude: number
  longitude: number
  rate: BoardRate | null
  /** The owner, or their scout, prints and puts up booked ads instead of a dispatcher. */
  printsOwn: boolean
  /** The kind of road it faces. */
  roadClass?: RoadClass | null
  /** About how many people pass each day, or null when nobody knows. */
  traffic?: TrafficEstimate | null
  /** What the rate costs for each 1,000 people passing. */
  costPerThousandMinor?: number | null
  /** On a digital screen: its loop. The rate is then for one slot, all day. */
  loop?: ScreenLoop | null
  status: BoardStatus
  /** Metres from the search point, on a nearby search. */
  distanceM: number | null
  coverUrl: string | null
  /** Advertisers' average rating, once enough are in. */
  rating: RatingSummary
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
  /** What the owner reads, filled in and kept from when it was sent. Admins set the wording. */
  wording: { headline: string; shareLine: string; terms: string[] }
  rate: BoardRate | null
  expiresAt: string
  signedName: string | null
  signedAt: string | null
  scout: { name: string; avatarUrl: string | null } | null
  board: Pick<Board, 'name' | 'kindLabel' | 'widthM' | 'heightM' | 'faces' | 'lit' | 'address' | 'city' | 'latitude' | 'longitude' | 'coverUrl'>
}

/** A board with its photos. The owner, agreement and review notes come only to whoever looks after it and reviewers. */
export interface BoardDetail extends Board {
  /** The reputation of the board's owner and the scout who runs it, without names. */
  stewards: RoleStanding[]
  photos: BoardPhoto[]
  /** Each face is booked on its own, A first. */
  rateCard: BoardFace[]
  /** Whether it takes bookings now. */
  booking: BoardBookingTerms
  owner?: OwnerProfile | null
  taggedById?: ID | null
  /** What the owner charges to print and put up an ad, when they do it. Null uses the standard price. */
  ownPrintFeeMinor?: number | null
  /** People passing each day, when someone counted them. */
  measuredTraffic?: number | null
  /** On a digital screen: the loop the owner set, or null for the standard one. */
  ownLoopSlots?: number | null
  ownSlotSeconds?: number | null
  /** On a digital screen: whether its player has a token, and when it last checked in. */
  player?: { connected: boolean; seenAt: string | null } | null
  /** Whether the tagger fixed what the owner receives, so the rate is listed with the other shares on top. */
  ownerNet?: boolean
  /** The owner's amount per period, when `ownerNet` is on. */
  ownerRateMinor?: number | null
  /** The percent of the rent the owner gets. */
  ownerPercent?: number
  reviewNote?: string | null
  reviewedAt?: string | null
  /** For boards a scout runs for their owner. */
  agreement?: BoardAgreement | null
  /** Days kept off the market that haven't passed yet. */
  blocks?: AvailabilityBlock[]
}

export interface AdminBoard extends BoardDetail {
  tagger: AdminUser | null
  /** The nearest board facing a similar way when this one was tagged. */
  duplicateOf: DuplicateBoard | null
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
  headingDeg?: number | null
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
  printsOwn?: boolean
  printFeeMinor?: number | null
  /** `rateMinor` is what the owner receives; the listed rate adds the other shares on top. */
  ownerNet?: boolean
  roadClass?: RoadClass | null
  /** People passing each day, when someone counted them. */
  dailyTraffic?: number | null
  /** On a digital screen: slots in its loop and seconds each. Empty uses the standard loop. */
  loopSlots?: number | null
  slotSeconds?: number | null
}

/** The kind of road a board faces, for its traffic estimate. */
export type RoadClass = 'expressway' | 'major' | 'street' | 'local'

/** How many people pass a board each day: counted, or from the kind of road. */
export interface TrafficEstimate {
  daily: number
  source: 'measured' | 'road'
}

/** A suggested rate for a board being tagged, and what it's based on. */
export interface PriceGuide {
  period: BoardRatePeriod
  traffic: TrafficEstimate | null
  /** Listed boards of the same kind nearby, scaled to this board's size. */
  comparables: { count: number; radiusKm: number; lowMinor: number | null; medianMinor: number | null; highMinor: number | null } | null
  /** What the traffic is worth at the admin-set value of 1,000 views. */
  fromTrafficMinor: number | null
  suggestedMinor: number | null
  basis: 'comparables' | 'traffic' | null
}

export interface PriceGuideQuery {
  lat: number
  lng: number
  kind: BoardKind
  widthM: number
  heightM: number
  period?: BoardRatePeriod
  roadClass?: RoadClass | null
  dailyTraffic?: number | null
  /** The board being edited, to leave it out of the comparison. */
  except?: ID
}

/** A digital screen's loop: how many slots, and seconds each. */
export interface ScreenLoop {
  slots: number
  seconds: number
}

/** What to list a board at so its owner receives a fixed amount. */
export interface OwnerPriceQuote {
  ownerPercent: number
  listedMinor: number | null
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
  lit?: boolean
  /** Highest rate, in minor units. Boards without a rate are left out. */
  maxRateMinor?: number
}

/** The map's visible area, in degrees. */
export interface MapBounds {
  west: number
  south: number
  east: number
  north: number
}

/** What narrows the map down. */
export type BoardPinSearch = MapBounds & Pick<BoardSearch, 'kind' | 'lit' | 'maxRateMinor'>

/** A listed board as a point on the map. */
export interface BoardPin {
  id: ID
  name: string
  kind: BoardKind
  latitude: number
  longitude: number
  lit: boolean
  rateMinor: number | null
  currency: string
  ratePeriod: BoardRatePeriod
}

/** Pins for one view of the map. `truncated` means there were more than `max`, so zoom in. */
export interface BoardPinsResponse {
  data: BoardPin[]
  meta: { truncated: boolean; max: number }
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

/** One side of a board, booked on its own. */
export interface BoardFace {
  id: ID
  position: number
  label: string
  headingDeg: number | null
  /** What it costs per week or month: its own rate, else the board's. */
  rateMinor: number | null
  /** Its own rate, or null when it uses the board's. */
  ownRateMinor: number | null
  /** The owner's fixed amount for this face, on a board that fixes it. Only for whoever looks after the board. */
  ownerRateMinor?: number | null
  /** The fewest weeks or months one booking can take. */
  minPeriods: number
}

export interface BoardFaceInput {
  label?: string
  headingDeg?: number | null
  rateMinor?: number | null
  minPeriods?: number
}

/** Days the owner keeps for their own clients. With no face, the whole board. */
export interface AvailabilityBlock {
  id: ID
  faceId: ID | null
  startsOn: string
  endsOn: string
  note: string | null
}

export interface AvailabilityBlockInput {
  startsOn: string
  endsOn: string
  faceId?: ID | null
  note?: string | null
}

/** A board already tagged near a spot, shown before tagging it again. */
export interface NearbyBoard {
  id: ID
  name: string
  status: BoardStatus
  headingDeg: number | null
  distanceM: number
}

/** What a spreadsheet import found in each row, and what it made. */
export interface BoardImportResult {
  dryRun: boolean
  total: number
  ok: number
  failed: number
  imported: number
  rows: {
    /** The row's line in the file, counting the heading as line 1. */
    line: number
    name: string
    ok: boolean
    errors: string[]
    /** Boards already tagged near the spot. */
    duplicates: number
    boardId?: ID
  }[]
}

export interface BoardImportInput {
  /** The spreadsheet, saved as CSV. */
  csv: string
  /** Check every row without saving. */
  dryRun?: boolean
  /** Import under an owner profile the account manages, rather than its own. */
  ownerProfileId?: ID | null
}

/** How a price rule changes each rate: by a percent, by an amount, or to an amount. */
export type PriceChange = 'percent' | 'amount' | 'set'

export interface PriceRuleInput {
  boardIds: ID[]
  change: PriceChange
  /** A percent for `percent`; kobo for `amount` (may be negative) and `set`. */
  value: number
  /** Round each new rate to this many kobo. ₦1,000 by default. */
  roundToMinor?: number
  /** Also change faces with their own rate. On by default. */
  faces?: boolean
  dryRun?: boolean
}

export interface PriceRuleResult {
  dryRun: boolean
  changed: number
  rows: {
    boardId: ID
    name: string
    /** The rule changed the owner's fixed amount, and the listed rate followed. */
    ownerNet: boolean
    beforeMinor: number | null
    afterMinor: number | null
    faces: { id: ID; label: string; beforeMinor: number; afterMinor: number }[]
    skipped: string | null
  }[]
}
