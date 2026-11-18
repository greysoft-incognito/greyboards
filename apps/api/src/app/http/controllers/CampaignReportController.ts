import { BookingCollection } from '@app/http/resources/BookingCollection'
import { CampaignReportCollection } from '@app/http/resources/CampaignReportCollection'
import { CampaignReport } from '@app/models/CampaignReport'
import { CampaignReports } from '@app/services/CampaignReports'
import { BaseController } from './BaseController'
import { GenericResource } from 'resora'
import { RequestException, perPage } from '@arkstack/common'

/** Campaign reports: the advertiser's own, and the shared page anyone with the link sees. */
export default class CampaignReportController extends BaseController {
  async index() {
    const reports = await CampaignReport.query().where({ userId: this.user.id }).latest('createdAt').paginate(perPage(this.query, { perPage: 20, maxPerPage: 50 }))

    return new CampaignReportCollection(reports).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** The bookings a report can hold: the advertiser's whose ads went up. */
  async bookings() {
    const bookings = await CampaignReports.eligible(this.user).paginate(perPage(this.query, { perPage: 50, maxPerPage: 100 }))

    return new BookingCollection(bookings).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async store() {
    const data = await this.validate({ title: 'required|string|min:3|max:120', bookingIds: 'required|array', 'bookingIds.*': 'required|string' })
    const report = await CampaignReports.create(this.user, String(data.title), (data.bookingIds as unknown[]).map(String))

    return new GenericResource(await CampaignReports.present(report, true)).additional({ status: 'success', message: 'Report ready to share.', code: 201 }).response().setStatusCode(201)
  }

  /** The report as its owner sees it, with the link and what it cost. */
  async show() {
    const report = await this.mine()

    return new GenericResource(await CampaignReports.present(report, true)).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** A new link. Whoever had the old one can't open it any more. */
  async relink() {
    const report = await CampaignReports.relink(await this.mine())

    return new GenericResource({ link: CampaignReports.link(report) }).additional({ status: 'success', message: 'New link made. The old one no longer works.', code: 200 })
  }

  async destroy() {
    await (await this.mine()).delete()

    return new GenericResource({}).additional({ status: 'success', message: 'Report deleted. Its link no longer works.', code: 200 })
  }

  /** The shared page. Works signed out. */
  async shared() {
    const report = await CampaignReports.byToken(String(this.params.token))
    const viewer = await this.viewer()

    return new GenericResource(await CampaignReports.present(report, viewer?.id === report.userId)).additional({ status: 'success', message: 'OK', code: 200 })
  }

  private async mine(): Promise<CampaignReport> {
    const report = await CampaignReport.query().find(String(this.params.report))

    if (!report || report.userId !== this.user.id) throw new RequestException('Report not found.', 404)

    return report
  }
}
