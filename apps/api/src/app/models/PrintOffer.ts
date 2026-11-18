import { Model } from '@arkstack/database'
import { PrintJob } from './PrintJob'
import { User } from './User'

/**
 * `requested` while a dispatcher decides on an advertiser's request, `pending` while the
 * advertiser can pay it (a bid, or an accepted request), `paid` once they did. `declined`,
 * `withdrawn` and `closed` (someone else's price was paid, or the job closed) end it.
 */
export type PrintOfferStatus = 'requested' | 'pending' | 'paid' | 'declined' | 'withdrawn' | 'closed'

/** `bid` when the dispatcher sent the price; `request` when the advertiser asked them at their rate. */
export type PrintOfferKind = 'bid' | 'request'

/** One dispatcher's price to print and post one job. */
export class PrintOffer extends Model {
  declare id: string
  declare printJobId: string
  declare dispatcherId: string
  declare kind: PrintOfferKind
  declare status: PrintOfferStatus
  declare amountMinor: number
  declare note: string | null
  declare expiresAt: Date
  declare createdAt: Date
  declare updatedAt: Date

  static readonly LIVE: PrintOfferStatus[] = ['requested', 'pending']

  protected static override table = 'print_offers'

  protected static override columns = {
    printJobId: 'print_job_id',
    dispatcherId: 'dispatcher_id',
    amountMinor: 'amount_minor',
    expiresAt: 'expires_at',
  }

  protected override casts = {
    amountMinor: 'number',
  } as never

  job() {
    return this.belongsTo(PrintJob, 'printJobId')
  }

  dispatcher() {
    return this.belongsTo(User, 'dispatcherId')
  }

  /** Still waiting on someone, and not run out. */
  isLive(): boolean {
    return PrintOffer.LIVE.includes(this.status) && this.expiresAt.getTime() > Date.now()
  }

  /** A live offer that ran out shows as closed. */
  displayStatus(): PrintOfferStatus {
    return PrintOffer.LIVE.includes(this.status) && !this.isLive() ? 'closed' : this.status
  }
}
