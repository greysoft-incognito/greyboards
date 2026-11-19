import { Board } from '@app/models/Board'
import { Booking } from '@app/models/Booking'
import { BookingMessage } from '@app/models/BookingMessage'
import { CampaignReport } from '@app/models/CampaignReport'
import { CampaignReportBooking } from '@app/models/CampaignReportBooking'
import { Dispute } from '@app/models/Dispute'
import { LedgerEntry } from '@app/models/LedgerEntry'
import { Payment } from '@app/models/Payment'
import { PlayLog } from '@app/models/PlayLog'
import { PostingProof } from '@app/models/PostingProof'
import { PrintJob } from '@app/models/PrintJob'
import { PrintJobMiss } from '@app/models/PrintJobMiss'
import { PrintOffer } from '@app/models/PrintOffer'
import { Review } from '@app/models/Review'
import { User } from '@app/models/User'
import { Payouts } from '@app/services/Payouts'
import { PaymentRegions } from '@app/services/payments/PaymentRegions'
import type { MockBoardSeed } from '../content/boards'
import { MockSeeder } from '../MockSeeder'
import type { MockBookingRecord } from './MockBookingSeeder'

/**
 * Everything after payment: print jobs and dispatchers' prices, the photos proving ads are
 * up, money released from escrow, messages, reviews, a dispute, screen plays and a report.
 */
export class MockFulfilmentSeeder extends MockSeeder {
  async run(): Promise<void> {
    await this.printJobs()
    await this.proofs()
    await this.release()
    await this.messages()
    await this.reviews()
    await this.disputes()
    await this.plays()
    await this.report()
  }

  private async printJobs(): Promise<void> {
    const jobs = []
    const offers = []
    const payments = []
    const ledger = []
    const provider = await PaymentRegions.defaultProvider()

    for (const booking of this.bookings().filter((entry) => entry.printedBy === 'dispatch' && entry.plan.printJobStatus && !this.board(entry).loopSlots)) {
      const { plan } = booking
      const status = plan.printJobStatus!
      const dispatcher = plan.reached('printing') ? this.data.find('users', plan.seed.dispatcher?.user) : null
      const feeMinor = booking.amountMinor - booking.rentMinor
      const approvedAt = new Date(booking.bookedAt.getTime() + 86_400_000)
      const paidAt = new Date(booking.bookedAt.getTime() + 2 * 86_400_000)
      const printedAt = plan.reached('printed') ? new Date(Math.min(this.data.on(booking.startsOn, 9).getTime() - 86_400_000, this.data.at(-1).getTime())) : null
      const photo = printedAt ? await this.data.images.artwork(`print-jobs/${booking.id}`, plan.seed.ad, this.ratio(booking)) : null
      const job = this.data.keep('jobs', plan.seed.key, { id: this.data.id(), dispatcherId: dispatcher?.id ?? null })

      jobs.push({
        id: job.id,
        bookingId: booking.id,
        boardId: booking.boardId,
        dispatcherId: job.dispatcherId,
        status,
        feeMinor,
        currency: booking.currency,
        dueOn: booking.startsOn,
        confirmedAt: dispatcher ? paidAt : null,
        printPhotoPath: photo?.path ?? null,
        printPhotoDisk: photo?.disk ?? null,
        printedAt,
        postedAt: status === 'posted' ? booking.proofAt : null,
        createdAt: approvedAt,
        updatedAt: printedAt ?? approvedAt,
      })

      for (const offer of plan.seed.printOffers ?? []) {
        offers.push({
          id: this.data.id(),
          printJobId: job.id,
          dispatcherId: this.data.get('users', offer.dispatcher).id,
          kind: 'bid',
          status: 'pending',
          amountMinor: offer.amount * 100,
          note: offer.note ?? null,
          expiresAt: this.data.at(2),
          ...this.data.stamps(-1, -offers.length),
        })
      }

      if (!dispatcher) continue

      const offerId = this.data.id()
      const payment = {
        id: this.data.id(),
        userId: booking.advertiserId,
        bookingId: booking.id,
        reference: `gbd_mock_${this.data.token(8)}`,
        provider,
        status: 'complete',
        amountMinor: feeMinor,
        currency: booking.currency,
        chargeAmountMinor: feeMinor,
        chargeCurrency: booking.currency,
        exchangeRate: 1,
        printOfferId: offerId,
        paidAt,
        createdAt: paidAt,
        updatedAt: paidAt,
      }

      offers.push({ id: offerId, printJobId: job.id, dispatcherId: dispatcher.id, kind: 'bid', status: 'paid', amountMinor: feeMinor, note: null, expiresAt: paidAt, createdAt: approvedAt, updatedAt: paidAt })
      payments.push(payment)
      ledger.push({
        id: this.data.id(),
        bookingId: booking.id,
        account: 'escrow',
        kind: 'payment_in',
        amountMinor: feeMinor,
        currency: booking.currency,
        userId: booking.advertiserId,
        reference: payment.reference,
        memo: 'Printing and posting, held until the ad is up',
        createdAt: paidAt,
        updatedAt: paidAt,
      })
    }

    await this.data.insert(PrintJob, jobs)
    await this.data.insert(PrintOffer, offers)
    await this.data.insert(Payment, payments)
    await this.data.insert(LedgerEntry, ledger)
    await this.missedJob()
  }

  /** A job Esther reserved and let lapse before Yakubu took it over. */
  private async missedJob(): Promise<void> {
    const job = this.data.get('jobs', 'murtala-okafor')
    const miss = this.data.keep('misses', 'esther', { id: this.data.id() })

    await this.data.insert(PrintJobMiss, [{ id: miss.id, printJobId: job.id, dispatcherId: this.data.get('users', 'esther').id, stage: 'print', ...this.data.stamps(-110) }])
  }

  private async proofs(): Promise<void> {
    const rows = []

    for (const booking of this.bookings().filter((entry) => entry.plan.hasProof && !this.board(entry).loopSlots)) {
      const board = this.board(booking)
      const uploader = this.data.find('jobs', booking.plan.seed.key)?.dispatcherId ?? this.data.get('boards', board.key).taggedById

      for (const shot of [0, 1]) {
        const photo = await this.data.images.board(`bookings/${booking.id}/proof`, board.name, booking.plan.seed.ad, shot + 1)

        rows.push({
          id: this.data.id(),
          bookingId: booking.id,
          uploadedById: uploader,
          ...photo,
          latitude: board.latitude + 0.0001 * (shot + 1),
          longitude: board.longitude,
          accuracyM: 5,
          distanceM: 11 * (shot + 1),
          takenAt: booking.proofAt,
          createdAt: booking.proofAt,
          updatedAt: booking.proofAt,
        })
      }
    }

    await this.data.insert(PostingProof, rows)
  }

  /** Move accepted campaigns' money out of escrow, through the one release authority, dated when the proof was accepted. */
  private async release(): Promise<void> {
    for (const record of this.bookings().filter((entry) => entry.acceptedAt)) {
      const booking = await Booking.query().findOrFail(record.id)

      await Payouts.release(booking)
      await LedgerEntry.query().where({ bookingId: record.id }).whereIn('kind', ['release', 'payout_due', 'commission']).updateFrom({ createdAt: record.acceptedAt, updatedAt: record.acceptedAt })
    }
  }

  private async messages(): Promise<void> {
    const rows = this.bookings().flatMap((booking) =>
      (booking.plan.seed.messages ?? []).map(([author, body], index) => {
        const at = new Date(Math.min(booking.bookedAt.getTime() + (index + 1) * 5 * 3_600_000, this.data.at(0, -1).getTime()))

        return { id: this.data.id(), bookingId: booking.id, authorId: this.data.get('users', author).id, body, createdAt: at, updatedAt: at }
      }),
    )

    await this.data.insert(BookingMessage, rows)
  }

  /** Reviews both ways on finished campaigns, and the running totals boards and advertisers show. */
  private async reviews(): Promise<void> {
    const rows = []
    const boards = new Map<string, [number, number]>()
    const advertisers = new Map<string, [number, number]>()

    for (const booking of this.bookings()) {
      const { review, advertiserReview } = booking.plan.seed
      const at = new Date((booking.acceptedAt ?? booking.bookedAt).getTime() + 3 * 86_400_000)
      const boardSide = this.data.get('boards', booking.plan.seed.board).taggedById as string

      if (review) {
        rows.push({ id: this.data.id(), bookingId: booking.id, authorId: booking.advertiserId, subject: 'board', boardId: booking.boardId, advertiserId: null, ...review, createdAt: at, updatedAt: at })
        MockFulfilmentSeeder.tally(boards, booking.boardId, review.rating)
      }

      if (advertiserReview) {
        rows.push({ id: this.data.id(), bookingId: booking.id, authorId: boardSide, subject: 'advertiser', boardId: booking.boardId, advertiserId: booking.advertiserId, ...advertiserReview, createdAt: at, updatedAt: at })
        MockFulfilmentSeeder.tally(advertisers, booking.advertiserId, advertiserReview.rating)
      }
    }

    await this.data.insert(Review, rows)

    for (const [id, [ratingSum, ratingCount]] of boards) await Board.query().where({ id }).updateFrom({ ratingSum, ratingCount })
    for (const [id, [advertiserRatingSum, advertiserRatingCount]] of advertisers) await User.query().where({ id }).updateFrom({ advertiserRatingSum, advertiserRatingCount })
  }

  private async disputes(): Promise<void> {
    const booking = this.data.get<MockBookingRecord>('bookings', 'uhuru-safari')

    await this.data.insert(Dispute, [
      {
        id: this.data.id(),
        bookingId: booking.id,
        openedById: booking.advertiserId,
        side: 'advertiser',
        reason: 'wrong_ad',
        details: 'Half the board still shows the previous advert. We launch on Monday, so we need it fixed before then.',
        status: 'open',
        ...this.data.stamps(0, -20),
      },
    ])
  }

  /** What the Constitution Road screen reported playing in the evenings since the campaign started. */
  private async plays(): Promise<void> {
    const booking = this.data.get<MockBookingRecord>('bookings', 'constitution-zaria')
    const seconds = Number(this.board(booking).slotSeconds)
    const rows = []

    for (let day = 4; day >= 1; day--) {
      for (let hour = 18; hour < 24; hour++) {
        rows.push({ id: this.data.id(), bookingId: booking.id, boardId: booking.boardId, faceId: booking.faceId, playedAt: this.data.on(this.data.day(-day), hour), durationMs: seconds * 1000, ...this.data.stamps(-day + 1) })
      }
    }

    await this.data.insert(PlayLog, rows)
  }

  private async report(): Promise<void> {
    const id = this.data.id()
    const keys = ['kawo-zaria', 'constitution-zaria', 'kano-zaria']

    await this.data.insert(CampaignReport, [{ id, userId: this.data.get('users', 'amina').id, title: 'Zaria Threads, Harmattan push', token: CampaignReport.newToken(), ...this.data.stamps(-1) }])
    await this.data.insert(
      CampaignReportBooking,
      keys.map((key, index) => ({ id: this.data.id(), reportId: id, bookingId: this.data.get('bookings', key).id, position: index + 1, ...this.data.stamps(-1) })),
    )
  }

  private bookings(): MockBookingRecord[] {
    return this.data.all<MockBookingRecord>('bookings')
  }

  private board(booking: MockBookingRecord): MockBoardSeed {
    return this.data.get('boards', booking.plan.seed.board).seed as MockBoardSeed
  }

  private ratio(booking: MockBookingRecord): number {
    const board = this.board(booking)

    return board.widthM / board.heightM
  }

  private static tally(totals: Map<string, [number, number]>, id: string, rating: number): void {
    const [sum, count] = totals.get(id) ?? [0, 0]

    totals.set(id, [sum + rating, count + 1])
  }
}
