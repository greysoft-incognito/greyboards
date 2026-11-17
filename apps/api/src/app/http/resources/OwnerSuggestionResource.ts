import type { OwnerProfile } from '@app/models/OwnerProfile'
import { Resource } from 'resora'

/** An owner offered while a scout types a name. The phone number stays mostly hidden. */
export class OwnerSuggestionResource extends Resource {
  async data() {
    const profile = this.resource as OwnerProfile

    return {
      id: profile.id,
      name: profile.name,
      phone: profile.maskedPhone(),
      claimed: profile.isClaimed(),
      boards: Number((profile as any).boards_count ?? (profile as any).boardsCount ?? 0),
    }
  }
}
