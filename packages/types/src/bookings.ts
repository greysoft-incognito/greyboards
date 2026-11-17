import type { PageQuery } from './api'
import type { Board, BoardRate } from './boards'
import type { ID } from './models'

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

export interface Booking {
  id: ID
  status: BookingStatus
  /** 'YYYY-MM-DD', both days on the board. */
  startsOn: string
  endsOn: string
  periods: number
  /** The face of the board it runs on. */
  face: { id: ID; label: string } | null
  rate: BoardRate
  /** Everything the advertiser pays, the print fee included. */
  amountMinor: number
  /** Printing and putting up the artwork. 0 on digital boards. */
  printFeeMinor: number
  /** Who prints and puts it up: a billposter from the marketplace, or the owner's side. */
  printedBy: PrintedBy
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
  /** What the advertiser gets back if they cancel now, while it's paid. Null for anyone else. */
  cancellation?: CancellationQuote | null
  refunds?: BookingRefund[]
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
  /** Whether the viewer photographs this ad: the billposter on the job, or the owner of a board with none. */
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
  dueOn: string
  printPhotoUrl: string | null
}

/**
 * `open` until a billposter reserves it, `reserved` for a few hours while they check the
 * date, `confirmed` once it is theirs, then `printed` and `posted`.
 */
export type PrintJobStatus = 'open' | 'reserved' | 'confirmed' | 'printed' | 'posted' | 'cancelled'

export interface PrintJob {
  id: ID
  status: PrintJobStatus
  feeMinor: number
  currency: string
  /** The day the ad must be up: the booking's first day. */
  dueOn: string
  /** When the hold ends, for the billposter holding it. */
  reservedUntil: string | null
  /** Whether the viewing billposter holds this job. */
  mine: boolean
  distanceM: number | null
  board: Board | null
  /** The artwork and the booked days show only to the billposter holding the job. */
  artworkUrl: string | null
  bookedDays: BookedDays | null
  printPhotoUrl: string | null
  /** The booking and its proof, for the billposter holding the job. */
  bookingId: ID | null
  proof: BookingProof | null
  createdAt: string
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
export type PrintedBy = 'billposter' | 'owner'

/** Whether a board takes bookings, and the limits for the date picker. */
export interface BoardBookingTerms {
  open: boolean
  /** Why it can't be booked yet. */
  reason: string | null
  earliestStart: string
  maxPeriods: number
  /** Added once to every booking for printing and putting up the artwork. */
  printFeeMinor: number
}

/** Days a booking already takes on a board. */
export interface BookedDays {
  startsOn: string
  endsOn: string
  /** The owner kept these days, rather than someone booking them. */
  blocked?: boolean
}

export interface BookingInput {
  startsOn: string
  periods: number
  /** Needed on boards with more than one face. */
  faceId?: ID
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
