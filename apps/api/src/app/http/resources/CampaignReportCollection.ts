import type { CampaignReport } from '@app/models/CampaignReport'
import { CampaignReportBooking } from '@app/models/CampaignReportBooking'
import { CampaignReports } from '@app/services/CampaignReports'
import { Collection } from './Collection'

/** A page of the advertiser's reports, each with its link and how many bookings it holds. */
export class CampaignReportCollection extends Collection {
  data() {
    const reports = this.items() as CampaignReport[]

    return reports.map(async (report) => ({
      id: report.id,
      title: report.title,
      bookings: await CampaignReportBooking.query().where({ reportId: report.id }).count(),
      link: CampaignReports.link(report),
      createdAt: report.createdAt,
    })) as never
  }
}
