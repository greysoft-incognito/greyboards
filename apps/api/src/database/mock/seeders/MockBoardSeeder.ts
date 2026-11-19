import { AvailabilityBlock } from '@app/models/AvailabilityBlock'
import { Board } from '@app/models/Board'
import { BoardAgreement } from '@app/models/BoardAgreement'
import { BoardFace } from '@app/models/BoardFace'
import { BoardPhoto } from '@app/models/BoardPhoto'
import { PaymentRegions } from '@app/services/payments/PaymentRegions'
import { AgreementWording } from '@app/support/AgreementWording'
import { Settings } from '@app/support/Settings'
import { createHash } from 'node:crypto'
import { BOARDS, type MockBoardSeed } from '../content/boards'
import { BOOKINGS } from '../content/campaigns'
import type { MockAd } from '../MockImages'
import { MockSeeder } from '../MockSeeder'

/** Stages whose ad is on the board today, for the board's photo. */
const SHOWING = ['proof_submitted', 'proof_disputed', 'live']

/** Boards with their faces and photos, the agreements their owners signed, and days owners blocked. */
export class MockBoardSeeder extends MockSeeder {
  async run(): Promise<void> {
    await this.boards()
    await this.faces()
    await this.photos()
    await this.agreements()
    await this.blocks()
  }

  private async boards(): Promise<void> {
    const reviewer = this.data.get('users', 'reviewer')
    const rows = []

    for (const seed of BOARDS) {
      const tagger = this.data.get('users', seed.taggedBy)
      const daysAgo = Number(tagger.joinedDaysAgo) - 10
      const board = this.data.keep('boards', seed.key, { id: this.data.id(), seed, daysAgo, taggedById: tagger.id })
      const reviewed = seed.status !== 'pending'

      rows.push({
        id: board.id,
        name: seed.name,
        description: seed.description,
        kind: seed.kind,
        widthM: seed.widthM,
        heightM: seed.heightM,
        faces: seed.faces,
        lit: seed.lit,
        address: seed.address,
        city: seed.city,
        country: seed.country,
        latitude: seed.latitude,
        longitude: seed.longitude,
        accuracyM: 6,
        headingDeg: seed.headingDeg,
        rateMinor: seed.rate * 100,
        currency: await PaymentRegions.currencyFor(seed.country),
        ratePeriod: seed.ratePeriod,
        status: seed.status,
        reviewNote: seed.reviewNote ?? null,
        ownerProfileId: this.data.get('owners', seed.owner).id,
        taggedById: tagger.id,
        reviewedById: reviewed ? reviewer.id : null,
        reviewedAt: reviewed ? this.data.at(-daysAgo + 1) : null,
        printsOwn: !!seed.printsOwn,
        printFeeMinor: seed.printFee ? seed.printFee * 100 : null,
        loopSlots: seed.loopSlots ?? null,
        slotSeconds: seed.slotSeconds ?? null,
        roadClass: seed.roadClass,
        dailyTraffic: seed.dailyTraffic,
        ...this.data.stamps(-daysAgo),
      })
    }

    await this.data.insert(Board, rows)
  }

  private async faces(): Promise<void> {
    const rows = this.data.all('boards').flatMap((board) => {
      const seed = board.seed as MockBoardSeed

      return Array.from({ length: seed.faces }, (_, index) => {
        const face = this.data.keep('faces', `${seed.key}:${index + 1}`, { id: this.data.id(), boardId: board.id })

        return {
          id: face.id,
          boardId: board.id,
          position: index + 1,
          label: `Face ${String.fromCharCode(65 + index)}`,
          headingDeg: (seed.headingDeg + index * 180) % 360,
          minPeriods: 1,
          ...this.data.stamps(-Number(board.daysAgo)),
        }
      })
    })

    await this.data.insert(BoardFace, rows)
  }

  private async photos(): Promise<void> {
    const rows = []

    for (const [index, board] of this.data.all('boards').entries()) {
      const seed = board.seed as MockBoardSeed
      const photo = await this.data.images.board(`boards/${board.id}`, seed.name, this.showing(seed.key), index)

      rows.push({
        id: this.data.id(),
        boardId: board.id,
        takenById: board.taggedById,
        ...photo,
        latitude: seed.latitude,
        longitude: seed.longitude,
        accuracyM: 6,
        takenAt: this.data.at(-Number(board.daysAgo)),
        ...this.data.stamps(-Number(board.daysAgo)),
      })
    }

    await this.data.insert(BoardPhoto, rows)
  }

  private async agreements(): Promise<void> {
    const share = await Settings.number('revenue.owner_percent')
    const rows = []

    for (const board of this.data.all('boards').filter((entry) => (entry.seed as MockBoardSeed).agreement)) {
      const seed = board.seed as MockBoardSeed
      const owner = this.data.get('owners', seed.owner)
      const scout = this.data.get('users', seed.taggedBy)
      const signed = seed.agreement === 'signed'
      const sentAt = signed ? this.data.at(-Number(board.daysAgo)) : this.data.at(-1)
      const terms = await AgreementWording.terms({
        owner: String(owner.name),
        scout: String(scout.name),
        board: seed.name,
        share,
        rate: { amountMinor: seed.rate * 100, currency: await PaymentRegions.currencyFor(seed.country), period: seed.ratePeriod },
      })

      const agreement = this.data.keep('agreements', seed.key, { id: this.data.id(), signed, scoutId: scout.id })

      rows.push({
        id: agreement.id,
        boardId: board.id,
        ownerProfileId: owner.id,
        sentById: scout.id,
        ownerName: owner.name,
        ownerPhone: owner.phone,
        ownerSharePercent: share,
        rateMinor: seed.rate * 100,
        currency: await PaymentRegions.currencyFor(seed.country),
        ratePeriod: seed.ratePeriod,
        status: signed ? BoardAgreement.SIGNED : BoardAgreement.SENT,
        tokenHash: createHash('sha256').update(this.data.token()).digest('hex'),
        expiresAt: new Date(sentAt.getTime() + 7 * 86_400_000),
        sendCount: 1,
        lastSentAt: sentAt,
        signedName: signed ? owner.name : null,
        signedAt: signed ? new Date(sentAt.getTime() + 3_600_000) : null,
        signedIp: signed ? '192.0.2.10' : null,
        signedUserAgent: signed ? 'Mozilla/5.0 (Linux; Android 13; SM-A145F) Mobile' : null,
        terms: JSON.stringify(terms),
        createdAt: sentAt,
        updatedAt: sentAt,
      })
    }

    await this.data.insert(BoardAgreement, rows)
  }

  private async blocks(): Promise<void> {
    await this.data.insert(AvailabilityBlock, [
      {
        id: this.data.id(),
        boardId: this.data.get('boards', 'barnawa').id,
        faceId: null,
        startsOn: this.data.day(45),
        endsOn: this.data.day(52),
        note: 'Repainting the frame and fixing the walkway.',
        createdById: this.data.get('users', 'ibrahim').id,
        ...this.data.stamps(-6),
      },
    ])
  }

  private showing(boardKey: string): MockAd | null {
    return BOOKINGS.find((booking) => booking.board === boardKey && SHOWING.includes(booking.stage))?.ad ?? null
  }
}
