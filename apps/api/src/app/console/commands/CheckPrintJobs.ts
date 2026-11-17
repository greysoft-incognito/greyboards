import { Command } from '@h3ravel/musket'
import { PrintDeadlines } from '@app/services/PrintDeadlines'

/** What the schedule runs: takes back print jobs that missed their dates and warns about jobs nobody took. */
export class CheckPrintJobsCommand extends Command {
  signature = 'print-jobs:check'

  description = 'Take back print jobs that missed their dates and warn about unclaimed ones'

  async handle() {
    const { missed, alerted } = await PrintDeadlines.run()

    this.success(`Took back ${missed} missed ${missed === 1 ? 'job' : 'jobs'} and warned about ${alerted} unclaimed.`)
  }
}
