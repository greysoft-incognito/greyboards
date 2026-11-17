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
  rate: BoardRate
  /** Everything the advertiser pays, the print fee included. */
  amountMinor: number
  /** Printing and putting up the artwork, paid to the billposter. 0 on digital boards. */
  printFeeMinor: number
  currency: string
  /** Seconds left to pay while the dates are held. */
  holdSecondsLeft: number | null
  advertiserId: ID
  split: BookingSplit | null
  board: Board | null
  paidAt: string | null
  cancelledAt: string | null
  createdAt: string
  /** On the booking's own page only. */
  artwork?: BookingArtwork
  printJob?: BookingPrintJob | null
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
}

export interface BookingInput {
  startsOn: string
  periods: number
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
