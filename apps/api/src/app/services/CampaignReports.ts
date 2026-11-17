import { abortIf } from '@arkstack/common'
import { Board } from '@app/models/Board'
import { BoardFace } from '@app/models/BoardFace'
import { BoardPhoto } from '@app/models/BoardPhoto'
import { Booking } from '@app/models/Booking'
import { CampaignReport } from '@app/models/CampaignReport'
import { CampaignReportBooking } from '@app/models/CampaignReportBooking'
import { PostingProof } from '@app/models/PostingProof'
import { User } from '@app/models/User'
import { PostingProofResource } from '@app/http/resources/PostingProofResource'
import { Day } from '@app/support/Day'
import { Settings } from '@app/support/Settings'

/**
 * Campaign reports. An advertiser groups bookings whose ads went up into one report: each
 * board, its dates and the proof photos taken there. Anyone with the link sees it, so it
 * can go to a client or a manager; a new link stops the old one working.
 */
export class CampaignReports {
  /** Bookings `user` made whose ads went up, newest first: what a report can hold. */
  static eligible(user: User) {
    return Booking.scope('madeBy', user).whereIn('status', [Booking.LIVE, Booking.COMPLETED]).latest('startsOn')
  }

  static async create(user: User, title: string, bookingIds: string[]): Promise<CampaignReport> {
    const ids = [...new Set(bookingIds)]
    const max = await Settings.number('reports.max_bookings')

    abortIf(!(await Settings.get('reports.enabled')), 'Campaign reports are turned off.', 422)
    abortIf(!ids.length, 'Pick at least one booking.', 422)
    abortIf(ids.length > max, `A report holds up to ${max} bookings.`, 422)
    abortIf((await CampaignReports.eligible(user).whereIn('id', ids).count()) !== ids.length, 'A report holds your bookings whose ads went up.', 422)

    const report = await CampaignReport.query().create({ userId: user.id, title: title.trim(), token: CampaignReport.newToken() })

    for (const [position, bookingId] of ids.entries()) await CampaignReportBooking.query().create({ reportId: report.id, bookingId, position })

    return report
  }

  /** A new link for the report. The old one stops working. */
  static async relink(report: CampaignReport): Promise<CampaignReport> {
    await report.update({ token: CampaignReport.newToken() })

    return report
  }

  static async byToken(token: string): Promise<CampaignReport> {
    const report = token ? await CampaignReport.query().where({ token }).first() : null

    abortIf(!report, 'This report link isn’t valid. Ask whoever sent it for a new one.', 404)

    return report!
  }

  /** The link to send, on the web app. */
  static link(report: CampaignReport): string {
    return `${String(config('app.frontend_url')).replace(/\/+$/, '')}/reports/${report.token}`
  }

  /**
   * The report as it's shared: each run with its board, dates and proof photos, and totals.
   * What it cost shows to its owner, and to others only when the settings allow.
   */
  static async present(report: CampaignReport, owner: boolean) {
    const rows = (await CampaignReportBooking.query().where({ reportId: report.id }).oldest('position').limit(100).get()).all()
    const bookingIds = rows.map((row) => row.bookingId)
    const bookings = new Map((bookingIds.length ? (await Booking.query().whereIn('id', bookingIds).get()).all() : []).map((booking) => [booking.id, booking]))
    const boardIds = [...new Set([...bookings.values()].map((booking) => booking.boardId))]
    const faceIds = [...bookings.values()].map((booking) => booking.faceId).filter((id): id is string => !!id)
    const boards = new Map((boardIds.length ? (await Board.query().whereIn('id', boardIds).get()).all() : []).map((board) => [board.id, board]))
    const faces = new Map((faceIds.length ? (await BoardFace.query().whereIn('id', faceIds).get()).all() : []).map((face) => [face.id, face]))
    const covers = await CampaignReports.covers(boardIds)
    const proofs = bookingIds.length ? (await PostingProof.query().whereIn('bookingId', bookingIds).oldest('createdAt').limit(bookingIds.length * PostingProof.MAX_PER_BOOKING).get()).all() : []
    const author = await User.query().find(report.userId)
    const showSpend = owner || !!(await Settings.get('reports.show_spend'))

    const runs = await Promise.all(
      rows
        .map((row) => bookings.get(row.bookingId))
        .filter((booking): booking is Booking => !!booking)
        .map(async (booking) => {
          const board = boards.get(booking.boardId)
          const { startsOn, endsOn } = booking.days()
          const photos = proofs.filter((proof) => proof.bookingId === booking.id)

          return {
            bookingId: booking.id,
            board: board
              ? {
                  id: board.id,
                  name: board.name,
                  kindLabel: board.kindLabel(),
                  widthM: board.widthM,
                  heightM: board.heightM,
                  lit: board.lit,
                  address: board.address,
                  city: board.city,
                  latitude: board.latitude,
                  longitude: board.longitude,
                  coverUrl: (await covers.get(board.id)?.url()) ?? null,
                }
              : null,
            face: booking.faceId ? (faces.get(booking.faceId)?.label ?? null) : null,
            startsOn,
            endsOn,
            days: Day.between(startsOn, endsOn) + 1,
            amountMinor: showSpend ? booking.amountMinor : null,
            proofAcceptedAt: booking.proofAcceptedAt,
            photos: await Promise.all(photos.map((photo) => new PostingProofResource(photo).data())),
          }
        }),
    )

    return {
      id: report.id,
      title: report.title,
      advertiser: author?.name ?? null,
      currency: bookings.values().next().value?.currency ?? 'NGN',
      summary: {
        boards: new Set(runs.map((run) => run.board?.id).filter(Boolean)).size,
        days: runs.reduce((sum, run) => sum + run.days, 0),
        photos: runs.reduce((sum, run) => sum + run.photos.length, 0),
        cities: [...new Set(runs.map((run) => run.board?.city).filter((city): city is string => !!city))],
        startsOn: runs.length ? runs.map((run) => run.startsOn).sort()[0]! : null,
        endsOn: runs.length ? runs.map((run) => run.endsOn).sort().at(-1)! : null,
        spendMinor: showSpend ? runs.reduce((sum, run) => sum + (run.amountMinor ?? 0), 0) : null,
      },
      runs,
      link: owner ? CampaignReports.link(report) : null,
      createdAt: report.createdAt,
    }
  }

  /** Each board's first photo. */
  private static async covers(boardIds: string[]): Promise<Map<string, BoardPhoto>> {
    const photos = boardIds.length ? (await BoardPhoto.query().whereIn('boardId', boardIds).oldest('createdAt').limit(boardIds.length * 10).get()).all() : []
    const covers = new Map<string, BoardPhoto>()

    for (const photo of photos) if (!covers.has(photo.boardId)) covers.set(photo.boardId, photo)

    return covers
  }
}
