import type { PrintJob } from '@app/models/PrintJob'
import type { User } from '@app/models/User'
import { Collection } from './Collection'
import { PrintJobResource } from './PrintJobResource'

export class PrintJobCollection extends Collection {
  collects = PrintJobResource

  private viewer: User | null = null

  for(viewer: User): this {
    this.viewer = viewer

    return this
  }

  data() {
    return (this.items() as PrintJob[]).map((job) => (this.viewer ? new PrintJobResource(job).for(this.viewer) : new PrintJobResource(job)).data()) as never
  }
}
