import { Model } from '@arkstack/database'

/** `print` when the finished print wasn't shown in time, `post` when the ad wasn't up by go-live. */
export type PrintJobMissStage = 'print' | 'post'

/** A print job a dispatcher lost by missing its date. Enough of them suspend the dispatcher. */
export class PrintJobMiss extends Model {
  declare id: string
  declare printJobId: string
  declare dispatcherId: string
  declare stage: PrintJobMissStage
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'print_job_misses'

  protected static override columns = {
    printJobId: 'print_job_id',
    dispatcherId: 'billposter_id',
  }
}
