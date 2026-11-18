import { PrintJob } from '@app/models/PrintJob'
import { PrintJobCollection } from '@app/http/resources/PrintJobCollection'
import { PrintJobResource } from '@app/http/resources/PrintJobResource'
import { imageFile } from '@app/support/rules'
import { Settings } from '@app/support/Settings'
import { BaseController } from './BaseController'
import { RequestException, perPage } from '@arkstack/common'

/** Dispatchers find print jobs near them, take them on, and show the finished print. */
export default class PrintJobController extends BaseController {
  /** Jobs anyone can take within reach of a point, nearest first, at most 50. */
  async index() {
    const query = await this.validateQuery({
      lat: 'required|numeric|min:-90|max:90',
      lng: 'required|numeric|min:-180|max:180',
      radiusKm: 'nullable|numeric|min:1|max:100',
    })
    const radius = query.radiusKm ? Number(query.radiusKm) : await Settings.number('printing.search_radius_km')

    const jobs = await PrintJob.scope('available').scope('near', Number(query.lat), Number(query.lng), radius).limit(PrintJob.SEARCH_LIMIT).get()

    return new PrintJobCollection(jobs.all()).for(this.user).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** Jobs the dispatcher holds or took, soonest due first. */
  async mine() {
    const jobs = await PrintJob.scope('takenBy', this.user).oldest('dueOn').paginate(perPage(this.query, { perPage: 20, maxPerPage: 50 }))

    return new PrintJobCollection(jobs).for(this.user).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async show() {
    const job = await this.job()

    if (!job.isAvailable() && !job.isHeldBy(this.user)) throw new RequestException('Someone else has taken this job.', 404)

    return this.respond(job, 'OK')
  }

  async reserve() {
    const job = await (await this.job()).reserve(this.user)

    return this.respond(job, 'Job held for you. Confirm once you know you can make the date.')
  }

  async confirm() {
    const job = await this.job()

    await job.confirm(this.user)

    return this.respond(job, 'The job is yours.')
  }

  async release() {
    const job = await this.job()

    await job.release(this.user)

    return this.respond(job, 'Job given back.')
  }

  /** A photo of the finished print before it goes up. */
  async printPhoto() {
    const job = await this.job()
    const data = await this.validate({ photo: imageFile((await Settings.number('uploads.max_image_mb')) * 1024) })

    await job.addPrintPhoto(this.user, data.photo)

    return this.respond(job, 'Print photo added.')
  }

  private async job(): Promise<PrintJob> {
    const job = await PrintJob.query().find(String(this.params.job))

    if (!job) throw new RequestException('Job not found.', 404)

    return job
  }

  private respond(job: PrintJob, message: string) {
    return new PrintJobResource(job).for(this.user).additional({ status: 'success', message, code: 200 })
  }
}
