import { Model } from '@arkstack/database'

/** `print` when the finished print wasn't shown in time, `post` when the ad wasn't up by go-live. */
export type PrintJobMissStage = 'print' | 'post'

/** A print job a billposter lost by missing its date. Enough of them suspend the billposter. */
export class PrintJobMiss extends Model {
  declare id: string
  declare printJobId: string
  declare billposterId: string
  declare stage: PrintJobMissStage
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'print_job_misses'

  protected static override columns = {
    printJobId: 'print_job_id',
    billposterId: 'billposter_id',
  }
}
