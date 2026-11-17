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
  amountMinor: number
  currency: string
  /** Seconds left to pay while the dates are held. */
  holdSecondsLeft: number | null
  advertiserId: ID
  split: BookingSplit | null
  board: Board | null
  paidAt: string | null
  cancelledAt: string | null
  createdAt: string
}

/** Whether a board takes bookings, and the limits for the date picker. */
export interface BoardBookingTerms {
  open: boolean
  /** Why it can't be booked yet. */
  reason: string | null
  earliestStart: string
  maxPeriods: number
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
