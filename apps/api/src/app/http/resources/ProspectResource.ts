import type { Prospect } from '@app/models/Prospect'
import { Resource } from 'resora'

/** A prospect in the scout's pipeline, with its stage worked out from the board once tagged. */
export class ProspectResource extends Resource {
  data() {
    const prospect = this.resource as Prospect

    return {
      id: prospect.id,
      name: prospect.name,
      latitude: prospect.latitude,
      longitude: prospect.longitude,
      address: prospect.address,
      ownerName: prospect.ownerName,
      ownerPhone: prospect.ownerPhone,
      notes: prospect.notes,
      stage: (prospect as any).current_stage ?? prospect.stage,
      boardId: prospect.boardId,
      stageChangedAt: prospect.stageChangedAt,
      createdAt: prospect.createdAt,
      updatedAt: prospect.updatedAt,
    }
  }
}
