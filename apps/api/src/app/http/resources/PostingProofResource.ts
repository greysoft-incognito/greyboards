import type { PostingProof } from '@app/models/PostingProof'
import { Resource } from 'resora'

/** A proof photo, with where it was taken and how far that is from the board. */
export class PostingProofResource extends Resource {
  async data() {
    const proof = this.resource as PostingProof

    return {
      id: proof.id,
      url: await proof.url(),
      width: proof.width,
      height: proof.height,
      latitude: proof.latitude,
      longitude: proof.longitude,
      accuracyM: proof.accuracyM,
      distanceM: proof.distanceM,
      takenAt: proof.takenAt,
      createdAt: proof.createdAt,
    }
  }
}
