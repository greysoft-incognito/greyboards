import type { OwnerProfile } from '@app/models/OwnerProfile'
import { Resource } from 'resora'

/** An owner profile, for the account that manages it, the scouts who tag its boards and reviewers. */
export class OwnerProfileResource extends Resource {
  async data() {
    const profile = this.resource as OwnerProfile

    return {
      id: profile.id,
      name: profile.name,
      phone: profile.phone,
      claimed: profile.isClaimed(),
      userId: profile.userId,
      phoneVerifiedAt: profile.phoneVerifiedAt,
      createdAt: profile.createdAt,
    }
  }
}
