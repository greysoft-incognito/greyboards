import type { ArtworkStatus, BookingStatus, PrintJobStatus, ProofStatus } from '@greyboards/types'
import type { MockBookingSeed, MockStage } from './content/campaigns'

/** How far each stage is along the paid booking's path. Unpaid stages sit at 0. */
const RANK: Record<MockStage, number> = {
  held: 0,
  expired: 0,
  cancelled: 0,
  paid: 1,
  artwork_submitted: 2,
  artwork_approved: 3,
  printing: 4,
  printed: 5,
  proof_submitted: 6,
  proof_disputed: 6,
  live: 7,
  completed: 7,
}

/** What a booking seed's stage means for each of the booking's states. */
export class MockBookingPlan {
  constructor(readonly seed: MockBookingSeed) {}

  get stage(): MockStage {
    return this.seed.stage
  }

  reached(stage: MockStage): boolean {
    return RANK[this.stage] >= RANK[stage] && RANK[stage] > 0
  }

  /** The advertiser paid for the booking, even if it was later cancelled. */
  get paid(): boolean {
    return this.reached('paid') || this.stage === 'cancelled'
  }

  get released(): boolean {
    return this.reached('live')
  }

  get status(): BookingStatus {
    if (this.stage === 'held' || this.stage === 'expired' || this.stage === 'cancelled') return this.stage
    if (this.stage === 'completed') return 'completed'
    if (this.stage === 'live') return 'live'

    return 'paid'
  }

  get artworkStatus(): ArtworkStatus {
    if (this.stage === 'artwork_submitted') return 'submitted'

    return this.reached('artwork_approved') ? 'approved' : 'none'
  }

  get proofStatus(): ProofStatus {
    if (this.stage === 'proof_submitted') return 'submitted'
    if (this.stage === 'proof_disputed') return 'disputed'

    return this.released ? 'accepted' : 'none'
  }

  /** The print job's state, on boards dispatchers print. */
  get printJobStatus(): PrintJobStatus | null {
    if (!this.reached('artwork_approved')) return null
    if (this.stage === 'artwork_approved') return 'open'
    if (this.stage === 'printing') return 'confirmed'
    if (this.stage === 'printed' || this.stage === 'proof_disputed') return 'printed'

    return 'posted'
  }

  get hasProof(): boolean {
    return this.reached('proof_submitted')
  }
}
