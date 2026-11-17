import { Model } from '@arkstack/database'
import { User } from './User'

/**
 * `active` while it can still win, `won` once the bidder was given the dates to pay for,
 * `lapsed` when they didn't pay in time, `lost` when the auction ended without it.
 */
export type BidStatus = 'active' | 'won' | 'lapsed' | 'lost'

/** An advertiser's bid for an auction's dates. Each bidder has one, raised as they go. */
export class Bid extends Model {
  declare id: string
  declare auctionId: string
  declare bidderId: string
  declare amountMinor: number
  declare status: BidStatus
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'bids'

  protected static override columns = {
    auctionId: 'auction_id',
    bidderId: 'bidder_id',
    amountMinor: 'amount_minor',
  }

  protected override casts = {
    amountMinor: 'number',
  } as never

  bidder() {
    return this.belongsTo(User, 'bidderId')
  }
}
