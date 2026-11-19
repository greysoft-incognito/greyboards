import { Model } from '@arkstack/database'
import type { Board } from './Board'

/** What a dispatcher charges to print and post, and how far from their base they work. */
export class DispatchRate extends Model {
  declare id: string
  declare userId: string
  declare pricePerSqmMinor: number
  declare minFeeMinor: number
  declare latitude: number
  declare longitude: number
  declare radiusKm: number
  declare note: string | null
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'dispatch_rates'

  protected static override columns = {
    userId: 'user_id',
    pricePerSqmMinor: 'price_per_sqm_minor',
    minFeeMinor: 'min_fee_minor',
    radiusKm: 'radius_km',
  }

  protected override casts = {
    pricePerSqmMinor: 'number',
    minFeeMinor: 'number',
    latitude: 'number',
    longitude: 'number',
  } as never

  /** Their price for one face of `board`: the rate by area, and never less than their minimum, in whole units of the board's currency. */
  quote(board: Board): number {
    const byArea = Math.round((Number(board.widthM) * Number(board.heightM) * Number(this.pricePerSqmMinor)) / 100) * 100

    return Math.max(byArea, Number(this.minFeeMinor))
  }
}
