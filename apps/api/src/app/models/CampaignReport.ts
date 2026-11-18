import { Model } from '@arkstack/database'
import { randomBytes } from 'node:crypto'

/** Bookings an advertiser grouped into one report, shared by its link. */
export class CampaignReport extends Model {
  declare id: string
  declare userId: string
  declare title: string
  declare token: string
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'campaign_reports'

  protected static override columns = {
    userId: 'user_id',
  }

  static newToken(): string {
    return randomBytes(18).toString('base64url')
  }
}
