import { Command } from '@h3ravel/musket'
import { Auction } from '@app/models/Auction'
import { Offer } from '@app/models/Offer'

/** What the schedule runs: closes auctions that ran out, passes unpaid wins on, and lapses unanswered offers. */
export class SettleBidsCommand extends Command {
  signature = 'bids:settle'

  description = 'Close due auctions, give unpaid wins to the next bid and lapse unanswered offers'

  async handle() {
    const changed = await Auction.settle()

    await Offer.expireDue()

    this.success(`Settled ${changed} ${changed === 1 ? 'auction' : 'auctions'}.`)
  }
}
