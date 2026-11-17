import type { Booking } from '@app/models/Booking'
import { PostingProof } from '@app/models/PostingProof'
import type { User } from '@app/models/User'
import { BookingPolicy } from '@app/policies/BookingPolicy'
import { Settings } from '@app/support/Settings'
import { PostingProofResource } from './PostingProofResource'

/**
 * A booking's proof of posting: its photos, where it stands, and what `viewer` can do with
 * it. The advertiser checks it; the billposter, or the owner of a board with no print job,
 * adds the photos.
 */
export class ProofSummary {
  private viewer: User | null = null

  constructor(private readonly booking: Booking) {}

  for(viewer: User): this {
    this.viewer = viewer

    return this
  }

  async data() {
    const booking = this.booking
    const photos = (await PostingProof.query().where({ bookingId: booking.id }).oldest('createdAt').limit(PostingProof.MAX_PER_BOOKING).get()).all()
    const open = booking.status === 'paid' && booking.artworkStatus === 'approved' && ['none', 'disputed'].includes(booking.proofStatus)
    const posts = open && !!this.viewer && (await BookingPolicy.postsProof(this.viewer, booking))

    return {
      status: booking.proofStatus,
      note: booking.proofNote,
      submittedAt: booking.proofSubmittedAt,
      acceptsAt: await booking.proofDeadline(),
      acceptedAt: booking.proofAcceptedAt,
      photos: await Promise.all(photos.map((photo) => new PostingProofResource(photo).data())),
      minPhotos: await Settings.number('proofs.min_photos'),
      maxPhotos: PostingProof.MAX_PER_BOOKING,
      maxDistanceM: await Settings.number('proofs.max_distance_m'),
      canAdd: posts,
      canReview: !!this.viewer && BookingPolicy.owns(this.viewer, booking) && booking.proofStatus === 'submitted',
    }
  }
}
