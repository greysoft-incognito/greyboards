import { Model } from '@arkstack/database'

/** One booking in a campaign report, in the order the advertiser picked. */
export class CampaignReportBooking extends Model {
  declare id: string
  declare reportId: string
  declare bookingId: string
  declare position: number
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'campaign_report_bookings'

  protected static override columns = {
    reportId: 'report_id',
    bookingId: 'booking_id',
  }
}
