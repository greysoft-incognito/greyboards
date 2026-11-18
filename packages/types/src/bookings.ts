import type { PageQuery } from './api'
import type { Auction } from './bids'
import type { Board, BoardRate, ScreenLoop } from './boards'
import type { ID } from './models'
import type { BookingReviews } from './reviews'

/**
 * `held` while the advertiser pays, `paid` once the money waits in escrow, `live` once
 * the artwork is up and proven, `completed` when the run ends.
 */
export type BookingStatus = 'held' | 'paid' | 'live' | 'completed' | 'cancelled' | 'expired'

/** How a paid booking's money is shared, shown to whoever looks after the board. */
export interface BookingSplit {
  ownerSharePercent: number
  ownerAmountMinor: number
  scoutAmountMinor: number
  platformAmountMinor: number
}

/** How a booking came about. */
export type BookingSource = 'book' | 'offer' | 'bid'

export interface Booking {
  id: ID
  status: BookingStatus
  /** 'YYYY-MM-DD', both days on the board. */
  startsOn: string
  endsOn: string
  periods: number
  /** The face of the board it runs on. */
  face: { id: ID; label: string } | null
  /** On a digital screen: the slots it takes. */
  slots?: BookingSlots | null
  rate: BoardRate
  /** Everything the advertiser pays, the print fee included. */
  amountMinor: number
  /** Printing and putting up the artwork. 0 on digital boards. */
  printFeeMinor: number
  /** Who prints and puts it up: a dispatcher from the marketplace, or the owner's side. */
  printedBy: PrintedBy
  /** Booked at the listed price, an accepted offer, or a won bid. */
  source: BookingSource
  /** Split between advertisers, each paying a share. `advertiserId` is the organiser. */
  shared: boolean
  currency: string
  /** Seconds left to pay while the dates are held. */
  holdSecondsLeft: number | null
  advertiserId: ID
  split: BookingSplit | null
  board: Board | null
  paidAt: string | null
  cancelledAt: string | null
  createdAt: string
  /** When the proof was accepted and the money left escrow. */
  releasedAt: string | null
  /** On the booking's own page only. */
  artwork?: BookingArtwork
  printJob?: BookingPrintJob | null
  proof?: BookingProof
  /** On a digital screen: how often the ad played. */
  plays?: PlaySummary | null
  /** What the advertiser gets back if they cancel now, while it's paid. Null for anyone else. */
  cancellation?: CancellationQuote | null
  refunds?: BookingRefund[]
  /** On a shared booking's own page: each share and who holds it. */
  shares?: BookingShare[] | null
  /** On a shared booking: when its lock for the sharers ends, and whether someone can now take the whole board. */
  /** On a shared booking: the lock for the sharers, and the bidding for the whole board once it ends. */
  sharing?: { lockedUntil: string; takeoverOpen: boolean; bidsCloseAt: string; auction: Auction | null } | null
  /** On the booking's own page: how many messages, and how many the viewer hasn't read. */
  messages?: MessageCounts
  /** On the booking's own page: the viewer's review and whether they can write it. */
  reviews?: BookingReviews
  /** On the booking's own page: its latest dispute and whether the viewer can raise one. */
  dispute?: BookingDisputes
}

export type DisputeReason = 'not_up' | 'wrong_ad' | 'damaged' | 'taken_down' | 'payment' | 'other'

/** `refund_full` and `refund_part` cancel the booking and send money back, `release` pays the board's side, `dismiss` changes nothing. */
export type DisputeDecision = 'refund_full' | 'refund_part' | 'release' | 'dismiss'

/** A problem with a booking for staff to decide. */
export interface Dispute {
  id: ID
  side: Exclude<MessageSide, 'staff'>
  reason: DisputeReason
  reasonLabel: string
  details: string
  status: 'open' | 'resolved'
  decision: DisputeDecision | null
  decisionLabel: string | null
  /** What went back to the advertiser. */
  refundMinor: number | null
  /** Why staff decided as they did. */
  resolution: string | null
  openedBy: string | null
  resolvedBy: string | null
  resolvedAt: string | null
  createdAt: string
}

export interface BookingDisputes {
  latest: Dispute | null
  canOpen: boolean
  /** Hours staff aim to decide in. */
  answerHours: number
}

export interface DisputeInput {
  reason: DisputeReason
  details: string
}

/** A dispute as staff see it, with its booking. */
export interface AdminDispute extends Dispute {
  booking: {
    id: ID
    status: BookingStatus
    startsOn: string
    endsOn: string
    amountMinor: number
    currency: string
    proofStatus: ProofStatus
    /** The money is still held, so it can be refunded or released. */
    inEscrow: boolean
    board: { id: ID; name: string } | null
  } | null
}

export interface DisputeResolution {
  decision: DisputeDecision
  resolution: string
  /** In major units, for `refund_part`. */
  refund?: number
}

export interface MessageCounts {
  total: number
  unread: number
}

/** Which side of a booking someone is on. */
export type MessageSide = 'advertiser' | 'board' | 'dispatch' | 'staff'

/** A message about a booking, with an optional photo as evidence. */
export interface BookingMessage {
  id: ID
  body: string | null
  photo: { url: string; width: number; height: number } | null
  author: { id: ID; name: string; avatarUrl: string | null; side: MessageSide } | null
  mine: boolean
  createdAt: string
}

/**
 * `open` until someone takes it from the invite link, `claimed` once they have, `paid`
 * once their money is in escrow, `refunded` when the booking didn't go ahead.
 */
export type ShareStatus = 'open' | 'claimed' | 'paid' | 'refunded'

/** One advertiser's part of a shared booking. */
export interface BookingShare {
  id: ID
  position: number
  amountMinor: number
  status: ShareStatus
  /** Who holds it, by name. */
  holder: string | null
  mine: boolean
  /** The link to send someone, for the organiser, while the share is open. */
  inviteUrl: string | null
  paidAt: string | null
  /** The holder's own design. The print merges everyone's. */
  designUrl: string | null
  designSentAt: string | null
}

/** What an invite link to a shared booking offers. */
export interface ShareInvite {
  position: number
  count: number
  amountMinor: number
  currency: string
  status: ShareStatus
  mine: boolean
  /** Still waiting for someone to take it. */
  open: boolean
  /** When the dates stop being held. */
  payBy: string | null
  organiser: string | null
  booking: Booking
}

/** What cancelling a paid booking now gives back, or why it can't be cancelled. */
export interface CancellationQuote {
  allowed: boolean
  reason: string | null
  refundMinor: number
  /** All the money back. */
  full: boolean
}

/** Money going back to the advertiser. */
export interface BookingRefund {
  amountMinor: number
  currency: string
  status: 'processing' | 'refunded' | 'failed'
  reason: string
  refundedAt: string | null
  createdAt: string
}

/**
 * Proof the ad is up: `none` until sent, `submitted` while the advertiser checks it,
 * `accepted` once the money is released, `disputed` when the advertiser asked for better.
 */
export type ProofStatus = 'none' | 'submitted' | 'accepted' | 'disputed'

/** A geotagged photo of the ad on its board. */
export interface ProofPhoto {
  id: ID
  url: string
  width: number
  height: number
  latitude: number
  longitude: number
  accuracyM: number | null
  /** Metres from the board. */
  distanceM: number
  takenAt: string | null
  createdAt: string
}

export interface BookingProof {
  status: ProofStatus
  /** What the advertiser asked to fix. */
  note: string | null
  submittedAt: string | null
  /** When an unchecked proof counts as accepted. */
  acceptsAt: string | null
  acceptedAt: string | null
  photos: ProofPhoto[]
  minPhotos: number
  maxPhotos: number
  /** How far from the board a photo may be taken. */
  maxDistanceM: number
  /** Whether the viewer photographs this ad: the dispatcher on the job, or the owner of a board with none. */
  canAdd: boolean
  /** Whether the viewer booked it and the proof waits for them. */
  canReview: boolean
}

export interface ProofPhotoLocation {
  latitude: number
  longitude: number
  accuracyM?: number | null
  takenAt?: string | null
}

/** Whoever looks after the board checks the artwork before it goes to print. */
export type ArtworkStatus = 'none' | 'submitted' | 'approved' | 'rejected'

export interface BookingArtwork {
  status: ArtworkStatus
  url: string | null
  width: number | null
  height: number | null
  /** Why it was sent back. */
  note: string | null
  reviewedAt: string | null
  /** Whether the viewer looks after the board and the artwork waits for them. */
  canReview: boolean
}

export interface BookingPrintJob {
  id: ID
  status: PrintJobStatus
  /** Whether a price was paid. An open job without one takes prices from dispatchers. */
  priced: boolean
  dueOn: string
  printPhotoUrl: string | null
}

/**
 * `open` until a dispatcher reserves it, `reserved` for a few hours while they check the
 * date, `confirmed` once it is theirs, then `printed` and `posted`. `cancelled` when whoever
 * looks after the board stepped in to do it themselves.
 */
export type PrintJobStatus = 'open' | 'reserved' | 'confirmed' | 'printed' | 'posted' | 'cancelled'

export interface PrintJob {
  id: ID
  status: PrintJobStatus
  /** Whether the advertiser paid a price. Open jobs without one take prices from dispatchers. */
  priced: boolean
  /** What the dispatcher earns, any rush bonus included. */
  feeMinor: number
  /** Extra pay because the job went back close to go-live. */
  bonusMinor: number
  currency: string
  /** The day the ad must be up: the booking's first day. */
  dueOn: string
  /** The last day for the photo of the finished print. Missing it loses the job. */
  printBy: string
  /** When the hold ends, for the dispatcher holding it. */
  reservedUntil: string | null
  /** Whether the viewing dispatcher holds this job. */
  mine: boolean
  distanceM: number | null
  board: Board | null
  /** The artwork and the booked days show only to the dispatcher holding the job. */
  artworkUrl: string | null
  bookedDays: BookedDays | null
  printPhotoUrl: string | null
  /** The booking and its proof, for the dispatcher holding the job. */
  bookingId: ID | null
  proof: BookingProof | null
  /** Messages about the booking, for the dispatcher holding the job. */
  messages: MessageCounts | null
  /** The viewing dispatcher's own price or request on this job, while it is open. */
  myOffer: PrintOffer | null
  createdAt: string
}

/**
 * `requested` while a dispatcher decides on a request, `pending` while the advertiser can
 * pay it, `paid` once they did. `declined`, `withdrawn` and `closed` end it.
 */
export type PrintOfferStatus = 'requested' | 'pending' | 'paid' | 'declined' | 'withdrawn' | 'closed'

/** `bid` when the dispatcher sent the price; `request` when the advertiser asked them at their rate. */
export type PrintOfferKind = 'bid' | 'request'

/** One dispatcher's price to print and post a job. */
export interface PrintOffer {
  id: ID
  kind: PrintOfferKind
  status: PrintOfferStatus
  amountMinor: number
  currency: string
  note: string | null
  /** Until when the advertiser can pay it, or the dispatcher can answer the request. */
  expiresAt: string
  dispatcher: { id: ID; name: string; avatarUrl: string | null } | null
  /** On the dispatcher's own list: the job it is for. */
  job: { id: ID; boardName: string; city: string | null; widthM: number; heightM: number; dueOn: string } | null
  createdAt: string
}

/** A dispatcher an advertiser can ask, with their price for the board. */
export interface DispatcherOption {
  id: ID
  name: string
  avatarUrl: string | null
  quoteMinor: number
  distanceM: number
  note: string | null
  /** Whether they already have a price or a request on this job. */
  asked: boolean
}

/** The prices on a booking's print job, and dispatchers nearby to ask. */
export interface PrintOptions {
  /** Whether the job still takes prices. */
  open: boolean
  offers: PrintOffer[]
  dispatchers: DispatcherOption[]
  maxRequests: number
}

/** What a dispatcher charges, and the area they cover from their base. */
export interface DispatchRate {
  /** False until they save their own; the values are then the starting ones. */
  saved: boolean
  pricePerSqmMinor: number
  minFeeMinor: number
  latitude: number | null
  longitude: number | null
  radiusKm: number
  note: string | null
}

export interface DispatchRateInput {
  pricePerSqmMinor: number
  minFeeMinor?: number | null
  latitude: number
  longitude: number
  radiusKm: number
  note?: string | null
}

export interface PrintJobSearch {
  lat: number
  lng: number
  radiusKm?: number
}

export interface ArtworkReview {
  decision: 'approve' | 'reject'
  note?: string
}

/** `owner` covers the owner or the scout who runs the board for them. */
export type PrintedBy = 'dispatch' | 'owner'

/** Whether a board takes bookings, and the limits for the date picker. */
export interface BoardBookingTerms {
  open: boolean
  /** Why it can't be booked yet. */
  reason: string | null
  earliestStart: string
  maxPeriods: number
  /** Added once to every booking for printing and putting up the artwork. */
  printFeeMinor: number
  /** Splitting a booking with other advertisers. */
  shares: {
    enabled: boolean
    /** The most advertisers one booking can be split between, the organiser included. */
    max: number
    /** Shared bookings need time for everyone to pay before the notice period. */
    earliestStart: string
    /** Hours everyone has to pay their share. */
    payHours: number
  }
}

/** Days a booking already takes on a board. */
export interface BookedDays {
  startsOn: string
  endsOn: string
  /** The owner kept these days, rather than someone booking them. */
  blocked?: boolean
  /** The days are open for bids. */
  auction?: boolean
}

export interface BookingInput {
  startsOn: string
  periods: number
  /** Needed on boards with more than one face. */
  faceId?: ID
  /** Split between this many advertisers, the organiser included. */
  shares?: number
  /** On a digital screen: how many slots of the loop, and for which part of the day. */
  slots?: number
  daypart?: Daypart
}

/** The part of the day a digital booking plays in. */
export type Daypart = 'all_day' | 'morning' | 'afternoon' | 'evening'

/** The slots a digital booking takes in the screen's loop, and its hours. */
export interface BookingSlots {
  start: number
  count: number
  daypart: Daypart
  hourFrom: number
  hourTo: number
}

/** How often a digital booking's ad played, as the screen's player reported it. */
export interface PlaySummary {
  total: number
  seconds: number
  lastPlayedAt: string | null
  /** Up to the last 31 days with plays, oldest first. */
  days: { day: string; plays: number; seconds: number }[]
}

/** A digital screen's loop, what part of the day costs a slot, and how many slots are free. */
export interface SlotQuote {
  loop: ScreenLoop
  dayparts: { daypart: Daypart; hours: [number, number]; percent: number; rateMinor: number }[]
  daypart: Daypart
  /** The most slots next to each other free for the dates asked, or null when no dates were sent. */
  freeSlots: number | null
}

/** What a digital screen's player is told to play on a day. */
export interface ScreenSchedule {
  day: string
  loop: ScreenLoop
  bookings: (BookingSlots & { bookingId: ID; faceId: ID | null; startsOn: string; endsOn: string; artworkUrl: string | null })[]
}

export type PaymentStatus = 'pending' | 'complete' | 'rejected'

export interface Payment {
  id: ID
  reference: string
  status: PaymentStatus
  amountMinor: number
  currency: string
  bookingId: ID
  /** The provider's page to pay on, when the payment was just started. */
  checkoutUrl: string | null
  paidAt: string | null
  createdAt: string
}

export interface BookingQuery extends PageQuery {
  status?: BookingStatus
}

/** A shared booking anyone can find and join, or take whole once its lock ends. */
export interface SharedBooking {
  id: ID
  board: Board | null
  startsOn: string
  endsOn: string
  currency: string
  /** The whole board for the days. */
  amountMinor: number
  count: number
  openCount: number
  paidCount: number
  /** What one open share costs. */
  shareAmountMinor: number | null
  organiser: string | null
  /** When the dates are let go if shares are still unpaid. */
  payBy: string | null
  /** Until then the board is kept for the sharers. */
  lockedUntil: string
  /** Whether anyone can bid for the whole board now. */
  takeoverOpen: boolean
  /** When bidding for the whole board closes, or would once someone bids. */
  bidsCloseAt: string
  /** The bidding for the whole board, once someone bid. */
  auction: Auction | null
  /** Whether the viewer is already sharing it. */
  joined: boolean
}

export interface SharedBookingQuery {
  boardId?: ID
  lat?: number
  lng?: number
  radiusKm?: number
}
