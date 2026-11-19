import { Board, type BoardKind, type BoardRatePeriod, type RoadClass } from '@app/models/Board'
import { Settings } from '@app/support/Settings'
import { ExchangeRates } from './payments/ExchangeRates'
import { PaymentRegions } from './payments/PaymentRegions'

/** Where a traffic estimate came from: a count someone measured, or the kind of road. */
export type TrafficSource = 'measured' | 'road'

/** How many people pass a board each day, and how we know. */
export interface TrafficEstimate {
  daily: number
  source: TrafficSource
}

/** A board, or one being tagged, to guide a price for. */
export interface GuideInput {
  latitude: number
  longitude: number
  kind: BoardKind
  widthM: number
  heightM: number
  period: BoardRatePeriod
  roadClass?: RoadClass | null
  dailyTraffic?: number | null
  /** The currency to guide in. Only boards priced in it are compared. */
  currency: string
  /** Leave this board out of the comparison, when guiding one already tagged. */
  exceptId?: string
}

/** Days in a week and in an average month, to turn traffic a day into views a period. */
const DAYS: Record<BoardRatePeriod, number> = { week: 7, month: 365 / 12 }

/**
 * Helps whoever tags a board pick a fair rate, and shows advertisers what a board reaches.
 * Listed boards of the same kind nearby give a range by the square metre; with too few, the
 * board's traffic and the admin-set value of 1,000 views give a price instead.
 */
export class PriceGuide {
  /** People passing each day: a measured count, or the admin's figure for the kind of road. Null when neither is known. */
  static async traffic(roadClass: RoadClass | null | undefined, measured: number | null | undefined): Promise<TrafficEstimate | null> {
    if (measured !== null && measured !== undefined && measured > 0) return { daily: Number(measured), source: 'measured' }
    if (!roadClass || !Board.ROAD_CLASSES.includes(roadClass)) return null

    return { daily: await Settings.number(`traffic.${roadClass}_daily`), source: 'road' }
  }

  /** What one period at `rateMinor` costs for each 1,000 people passing, or null without traffic. */
  static costPerThousand(rateMinor: number | null, period: BoardRatePeriod, traffic: TrafficEstimate | null): number | null {
    if (rateMinor === null || !traffic || traffic.daily <= 0) return null

    return Math.round((rateMinor * 1000) / (traffic.daily * DAYS[period]))
  }

  /** A suggested rate for one period, with the boards nearby it was compared with and the price traffic alone gives. */
  static async guide(input: GuideInput) {
    const area = Math.max(0.01, Number(input.widthM) * Number(input.heightM))
    const traffic = await PriceGuide.traffic(input.roadClass, input.dailyTraffic)
    const comparables = await PriceGuide.comparables(input, area)
    const cpm = await PriceGuide.cpm(input.currency)
    const fromTraffic = traffic && cpm > 0 ? PriceGuide.round((traffic.daily * DAYS[input.period] * cpm) / 1000) : null
    const enough = comparables.count >= (await Settings.number('traffic.comparables_min'))

    return {
      currency: input.currency,
      period: input.period,
      traffic,
      comparables: comparables.count ? comparables : null,
      fromTrafficMinor: fromTraffic,
      suggestedMinor: enough ? comparables.medianMinor : fromTraffic,
      basis: enough ? ('comparables' as const) : fromTraffic !== null ? ('traffic' as const) : null,
    }
  }

  /**
   * Listed boards of the same kind nearby, their rates turned into this board's period and
   * scaled to its size by the square metre: the lowest, the median and the highest.
   */
  private static async comparables(input: GuideInput, area: number) {
    const radiusKm = await Settings.number('traffic.comparables_radius_km')
    const query = Board.query()
      .where({ status: Board.LISTED, kind: input.kind, currency: input.currency })
      .whereNotNull('rateMinor')
      .scope('near', Number(input.latitude), Number(input.longitude), radiusKm)

    if (input.exceptId) query.whereRaw('boards.id <> ?', [input.exceptId])

    const boards = (await query.limit(50).get()).all()
    const perSqm = boards
      .map((board) => {
        const size = Number(board.widthM) * Number(board.heightM)
        const inPeriod = (board.rate() ?? 0) * (DAYS[input.period] / DAYS[board.ratePeriod])

        return size > 0 ? inPeriod / size : 0
      })
      .filter((value) => value > 0)
      .sort((first, second) => first - second)

    if (!perSqm.length) return { count: 0, radiusKm, lowMinor: null, medianMinor: null, highMinor: null }

    const middle = Math.floor(perSqm.length / 2)
    const median = perSqm.length % 2 ? perSqm[middle]! : (perSqm[middle - 1]! + perSqm[middle]!) / 2

    return {
      count: perSqm.length,
      radiusKm,
      lowMinor: PriceGuide.round(perSqm[0]! * area),
      medianMinor: PriceGuide.round(median * area),
      highMinor: PriceGuide.round(perSqm[perSqm.length - 1]! * area),
    }
  }

  /** The admin's value of 1,000 views, set in the default currency, in `currency`. Zero when there's no rate to convert it at. */
  private static async cpm(currency: string): Promise<number> {
    const cpm = await Settings.number('traffic.cpm_minor')
    const base = await PaymentRegions.defaultCurrency()

    if (cpm <= 0 || base === currency) return cpm

    return cpm * (await ExchangeRates.rate(base, currency).catch(() => 0))
  }

  /** To the nearest 1,000 of the currency, which is how rates are usually quoted. */
  private static round(minor: number): number {
    return Math.max(100_000, Math.round(minor / 100_000) * 100_000)
  }
}
