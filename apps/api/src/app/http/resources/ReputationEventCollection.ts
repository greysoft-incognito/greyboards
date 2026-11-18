import type { ReputationEvent } from '@app/models/ReputationEvent'
import { Reputation } from '@app/services/Reputation'
import { Collection } from './Collection'

/** A page of a role's reputation history, newest first, each with what earned or cost it. */
export class ReputationEventCollection extends Collection {
  data() {
    const events = this.items() as ReputationEvent[]

    return events.map((event) => ({
      id: event.id,
      action: event.action,
      label: event.action === 'adjusted' ? 'Corrected by Greyboards staff' : (Reputation.RULES.find((rule) => rule.action === event.action)?.label ?? event.action),
      points: Number(event.points),
      note: event.note,
      subjectId: event.subjectId,
      createdAt: event.createdAt,
    })) as never
  }
}
