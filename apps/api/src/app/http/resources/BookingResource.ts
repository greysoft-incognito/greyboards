import { Auction } from '@app/models/Auction'
import type { Booking } from '@app/models/Booking'
import type { Board } from '@app/models/Board'
import { PrintJob } from '@app/models/PrintJob'
import { User } from '@app/models/User'
import { BookingPolicy } from '@app/policies/BookingPolicy'
import { ProofSummary } from './ProofSummary'
import { Day } from '@app/support/Day'
import { Refund } from '@app/models/Refund'
import { Refunds } from '@app/services/Refunds'
import { Messages } from '@app/services/Messages'
import { Review } from '@app/models/Review'
import { Reviews } from '@app/services/Reviews'
import { Shares } from '@app/services/Shares'
import { ScreenPlayer } from '@app/services/ScreenPlayer'
import { Disputes } from '@app/services/Disputes'
import { Settings } from '@app/support/Settings'
import { DisputeCollection } from './DisputeCollection'
import { Resource } from 'resora'
import { AuctionResource } from './AuctionResource'
import { BoardResource } from './BoardResource'

/**
 * A booking, with its board. The advertiser sees what they pay; whoever looks after the
 * board also sees how the money is split once it's paid.
 */
export class BookingResource extends Resource {
  private board?: Board | null

  private showSplit = false

  private detailed = false

  private viewer: User | null = null

  /** The booked board, when the caller already loaded it. */
  onBoard(board: Board | null): this {
    this.board = board

    return this
  }

  /** Show the owner's and scout's amounts, for whoever looks after the board and staff. */
  withSplit(show: boolean): this {
    this.showSplit = show

    return this
  }

  /** Add the artwork, the print job and the proof, with what `viewer` can do to each, for the booking's own page. */
  withDetails(viewer: User): this {
    this.detailed = true
    this.viewer = viewer

    return this
  }

  private async details(booking: Booking, board: Board | null) {
    const viewer = this.viewer!
    const job = await PrintJob.query().where({ bookingId: booking.id }).first()
    const manages = await BookingPolicy.managesBoard(viewer, booking)

    return {
      artwork: {
        status: booking.artworkStatus,
        url: await booking.artworkUrl(),
        width: booking.artworkWidth,
        height: booking.artworkHeight,
        note: booking.artworkNote,
        reviewedAt: booking.artworkReviewedAt,
        canReview: manages && booking.artworkStatus === 'submitted',
      },
      printJob: job ? { id: job.id, status: job.displayStatus(), priced: job.isPriced(), dueOn: Day.of(job.dueOn), printPhotoUrl: await job.printPhotoUrl() } : null,
      proof: await new ProofSummary(booking).for(viewer).data(),
      /** On a digital screen: how often the ad played, as the screen's player reported it. */
      plays: board?.isDigital() ? await ScreenPlayer.summary(booking) : null,
      cancellation: BookingPolicy.owns(viewer, booking) && booking.status === 'paid' ? await Refunds.quote(booking) : null,
      shares: booking.shared ? await BookingResource.shares(booking, viewer) : null,
      /** On a shared booking: when its lock for the sharers ends, whether the whole board is open to bids, and the bidding once it started. */
      sharing: booking.shared ? await BookingResource.sharing(booking, viewer) : null,
      messages: await Messages.counts(booking, viewer),
      reviews: await BookingResource.reviews(booking, viewer),
      dispute: await BookingResource.dispute(booking, viewer),
      refunds: (await Refund.query().where({ bookingId: booking.id }).oldest('createdAt').limit(10).get()).all().map((refund) => ({
        amountMinor: Number(refund.amountMinor),
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason,
        refundedAt: refund.refundedAt,
        createdAt: refund.createdAt,
      })),
    }
  }

  /**
   * Each share of a shared booking, who holds it and whether it's paid. The organiser sees
   * the invite link of each open share; nobody else sees links.
   */
  private static async sharing(booking: Booking, viewer: User | null) {
    const auction = await Auction.takeoverFor(booking)

    return {
      lockedUntil: await Shares.lockedUntil(booking),
      takeoverOpen: await Shares.takeoverOpen(booking),
      bidsCloseAt: auction?.closesAt ?? (await Shares.takeoverClosesAt(booking)),
      auction: auction ? await new AuctionResource(auction).for(viewer).data() : null,
    }
  }

  private static async shares(booking: Booking, viewer: User) {
    const shares = (await Shares.of(booking)).all()
    const holders = await User.query().whereIn('id', shares.map((share) => share.userId).filter((id): id is string => !!id)).get()
    const names = new Map(holders.all().map((holder) => [holder.id, holder.name]))
    const organiser = viewer.id === booking.advertiserId
    const base = String(config('app.frontend_url')).replace(/\/+$/, '')

    return Promise.all(shares.map(async (share) => ({
      id: share.id,
      position: share.position,
      amountMinor: share.amountMinor,
      status: share.status,
      holder: share.userId ? (names.get(share.userId) ?? null) : null,
      mine: share.userId === viewer.id,
      inviteUrl: organiser && share.status === 'open' ? `${base}/shares/${share.token}` : null,
      paidAt: share.paidAt,
      designUrl: await share.designUrl(),
      designSentAt: share.designSentAt,
    })))
  }

  /**
   * The booking's reviews: the one the viewer writes, if any, and whether they can still
   * write or change it. The advertiser's rating shows to the board's side.
   */
  private static async reviews(booking: Booking, viewer: User) {
    const subject = await Reviews.subjectFor(booking, viewer)
    const reviews = (await Review.query().where({ bookingId: booking.id }).limit(2).get()).all()
    const mine = reviews.find((review) => review.subject === subject)
    const advertiser = subject === 'advertiser' ? await User.query().find(booking.advertiserId) : null

    return {
      subject,
      canWrite: !!subject && (await Reviews.open(booking)),
      mine: mine ? { rating: mine.rating, body: mine.body, updatedAt: mine.updatedAt } : null,
      advertiserRating: advertiser ? await Reviews.summary(advertiser.advertiserRatingSum ?? 0, advertiser.advertiserRatingCount ?? 0) : null,
    }
  }

  /** The booking's latest dispute, and whether the viewer can raise one now. */
  private static async dispute(booking: Booking, viewer: User) {
    const latest = await Disputes.latest(booking)
    const side = await Disputes.sideOf(booking, viewer)
    const closedReason = side ? await Disputes.closedReason(booking) : null

    return {
      latest: latest ? DisputeCollection.present(latest, await DisputeCollection.names([latest])) : null,
      canOpen: !!side && !closedReason,
      answerHours: await Settings.number('disputes.answer_hours'),
    }
  }

  async data() {
    const booking = this.resource as Booking
    const board = this.board === undefined ? await booking.board().first() : this.board
    const { startsOn, endsOn } = booking.days()
    const face = booking.faceId ? await booking.face().first() : null

    return {
      id: booking.id,
      status: booking.displayStatus(),
      startsOn,
      endsOn,
      periods: booking.periods,
      face: face ? { id: face.id, label: face.label } : null,
      /** On a digital screen: the slots in the loop it takes, and the part of the day. */
      slots: board?.isDigital() ? { start: booking.slotStart, count: booking.slots, daypart: booking.daypart, hourFrom: booking.hourFrom, hourTo: booking.hourTo } : null,
      rate: { amountMinor: booking.rateMinor, currency: booking.currency, period: booking.ratePeriod },
      amountMinor: booking.amountMinor,
      printFeeMinor: booking.printFeeMinor,
      printedBy: booking.printedBy,
      source: booking.source ?? 'book',
      shared: !!booking.shared,
      currency: booking.currency,
      holdSecondsLeft: booking.secondsLeft(),
      advertiserId: booking.advertiserId,
      split:
        this.showSplit && booking.ownerAmountMinor !== null
          ? {
              ownerSharePercent: booking.ownerSharePercent,
              ownerAmountMinor: booking.ownerAmountMinor,
              scoutAmountMinor: booking.scoutAmountMinor,
              platformAmountMinor: booking.platformAmountMinor,
            }
          : null,
      board: board ? await new BoardResource(board).data() : null,
      ...(this.detailed ? await this.details(booking, board ?? null) : {}),
      paidAt: booking.paidAt,
      releasedAt: booking.releasedAt,
      cancelledAt: booking.cancelledAt,
      createdAt: booking.createdAt,
    }
  }
}
