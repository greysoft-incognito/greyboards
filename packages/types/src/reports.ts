import type { ProofPhoto } from './bookings'
import type { ID } from './models'

/** One booking in a campaign report: the board, its dates and the proof photos taken there. */
export interface CampaignRun {
  bookingId: ID
  board: {
    id: ID
    name: string
    kindLabel: string
    widthM: number
    heightM: number
    lit: boolean
    address: string | null
    city: string | null
    latitude: number
    longitude: number
    coverUrl: string | null
  } | null
  face: string | null
  startsOn: string
  endsOn: string
  days: number
  /** Null on a shared report unless the settings show spend. */
  amountMinor: number | null
  proofAcceptedAt: string | null
  photos: ProofPhoto[]
}

/** Bookings an advertiser grouped into one report and shares by link. */
export interface CampaignReport {
  id: ID
  title: string
  advertiser: string | null
  currency: string
  summary: {
    boards: number
    days: number
    photos: number
    cities: string[]
    startsOn: string | null
    endsOn: string | null
    spendMinor: number | null
  }
  runs: CampaignRun[]
  /** The link to share, for the report's owner. */
  link: string | null
  createdAt: string
}

/** A report in the advertiser's list. */
export interface CampaignReportSummary {
  id: ID
  title: string
  bookings: number
  link: string
  createdAt: string
}

export interface CampaignReportInput {
  title: string
  bookingIds: ID[]
}
