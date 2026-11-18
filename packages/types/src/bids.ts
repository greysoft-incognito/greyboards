import type { Board, BoardRatePeriod } from './boards'
import type { ID } from './models'
import type { RatingSummary } from './reviews'

/**
 * `open` while bids come in, `awarded` while the winner pays, `sold` once they paid,
 * `unsold` when nobody met the reserve or paid, `cancelled` when closed before any bid.
 */
export type AuctionStatus = 'open' | 'awarded' | 'sold' | 'unsold' | 'cancelled'

/** `open` shows the highest bid as it climbs; `sealed` hides bids until the close. */
export type AuctionFormat = 'open' | 'sealed'

/** `active` while it can win, `won` when given the dates to pay for, `lapsed` when not paid in time, `lost` otherwise. */
export type BidStatus = 'active' | 'won' | 'lapsed' | 'lost'

/** A face's dates open for bids. */
export interface Auction {
  id: ID
  status: AuctionStatus
  /** Still taking bids. */
  open: boolean
  format: AuctionFormat
  startsOn: string
  endsOn: string
  periods: number
  ratePeriod: BoardRatePeriod
  currency: string
  /** The least the board's side will take for the dates. */
  reserveMinor: number
  closesAt: string
  bidCount: number
  /** Hidden while a sealed auction is open. */
  highestMinor: number | null
  /** The least the next bid may be, while open. */
  nextMinimumMinor: number | null
  face: { id: ID; label: string } | null
  /** On bidding for a whole shared board: that shared booking. */
  takeoverOf: ID | null
  /** While the winner of a shared board pays: when their time runs out. */
  payBy: string | null
  /** The viewer's own bid. */
  myBid: {
    amountMinor: number
    status: BidStatus
    leading: boolean
    /** The booking to pay for, when this bid won. */
    bookingId: ID | null
  } | null
  /** In the account's list of bids. */
  board?: Board
  createdAt: string
}

export interface AuctionInput {
  faceId?: ID | null
  startsOn: string
  periods: number
  reserveMinor: number
  /** ISO date and time. */
  closesAt: string
}

/**
 * `pending` while the board's side decides, `countered` while the advertiser decides on a
 * counter, `accepted` once it became a booking, or `declined`, `withdrawn` or `expired`.
 */
export type OfferStatus = 'pending' | 'countered' | 'accepted' | 'declined' | 'withdrawn' | 'expired'

/** An offer below a board's listed price for some dates. */
export interface Offer {
  id: ID
  status: OfferStatus
  startsOn: string
  endsOn: string
  periods: number
  ratePeriod: BoardRatePeriod
  currency: string
  /** The listed price for the dates, before printing. */
  listMinor: number
  amountMinor: number
  /** What the board's side would take instead. */
  counterMinor: number | null
  note: string | null
  /** When it lapses if nobody answers. */
  expiresAt: string
  /** The held booking, once accepted. */
  bookingId: ID | null
  face: { id: ID; label: string } | null
  /** Who made it, with their rating from boards' sides. */
  advertiser: { id: ID; name: string; rating: RatingSummary } | null
  board: Board | null
  /** What the viewer can do now. */
  can: { accept: boolean; decline: boolean; counter: boolean; withdraw: boolean }
  respondedAt: string | null
  createdAt: string
}

export interface OfferInput {
  faceId?: ID | null
  startsOn: string
  periods: number
  amountMinor: number
  note?: string | null
}

export interface OfferQuery {
  status?: OfferStatus
  page?: number
  perPage?: number
}
