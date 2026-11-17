import { Booking } from '@app/models/Booking'
import { PostingProof } from '@app/models/PostingProof'
import { BookingResource } from '@app/http/resources/BookingResource'
import { PostingProofResource } from '@app/http/resources/PostingProofResource'
import { ProofSummary } from '@app/http/resources/ProofSummary'
import { BookingPolicy } from '@app/policies/BookingPolicy'
import { imageFile } from '@app/support/rules'
import { Settings } from '@app/support/Settings'
import { BaseController } from './BaseController'
import { GenericResource } from 'resora'
import { RequestException } from '@arkstack/common'

/**
 * Proof that an ad is up. The dispatcher, or the owner of a board with no print job, adds
 * geotagged photos and sends them; the advertiser accepts, which pays everyone, or says
 * what's wrong.
 */
export default class ProofController extends BaseController {
  /** A photo of the ad on the board, taken there. */
  async store() {
    const booking = await this.posting()
    const data = await this.validate({
      photo: imageFile((await Settings.number('uploads.max_image_mb')) * 1024),
      latitude: 'required|numeric|min:-90|max:90',
      longitude: 'required|numeric|min:-180|max:180',
      accuracyM: 'nullable|numeric|min:0|max:10000',
      takenAt: 'nullable|date',
    })

    const proof = await booking.addProof(this.user, data.photo, {
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      accuracyM: data.accuracyM ? Number(data.accuracyM) : null,
      takenAt: data.takenAt ? new Date(data.takenAt) : null,
    })

    return new PostingProofResource(proof).additional({ status: 'success', message: 'Photo added.', code: 201 }).response().setStatusCode(201)
  }

  async destroy() {
    const booking = await this.posting()
    const proof = await PostingProof.query().find(String(this.params.proof))

    if (!proof) throw new RequestException('Photo not found.', 404)

    await booking.removeProof(proof)

    return new GenericResource({ id: proof.id }).additional({ status: 'success', message: 'Photo removed.', code: 200 })
  }

  /** Send the photos to the advertiser to check. */
  async submit() {
    const booking = await this.posting()

    await booking.submitProof()

    return this.summary(booking, 'Sent to the advertiser to check.')
  }

  /** The advertiser agrees the ad is up, and the money is paid out. */
  async accept() {
    const booking = await this.advertisers()

    if (booking.proofStatus !== 'submitted' || !(await booking.acceptProof())) throw new RequestException('There is no proof waiting for you to check.', 422)

    return new BookingResource(booking).withDetails(this.user).additional({ status: 'success', message: 'Accepted. Your ad is live and everyone is paid.', code: 200 })
  }

  /** The advertiser says what's wrong with the proof. */
  async dispute() {
    const booking = await this.advertisers()
    const data = await this.validate({ note: 'required|string|max:500' })

    await booking.disputeProof(String(data.note))

    return new BookingResource(booking).withDetails(this.user).additional({ status: 'success', message: 'Sent back with your note.', code: 200 })
  }

  /** The booking, when the user is the one who photographs its ad. */
  private async posting(): Promise<Booking> {
    const booking = await this.find()

    if (!(await BookingPolicy.postsProof(this.user, booking))) throw new RequestException('Only the dispatcher on this job, or the owner of a board with none, adds proof.', 403)

    return booking
  }

  private async advertisers(): Promise<Booking> {
    const booking = await this.find()

    if (!BookingPolicy.owns(this.user, booking)) throw new RequestException('Only the person who booked checks the proof.', 403)

    return booking
  }

  private async find(): Promise<Booking> {
    const booking = await Booking.query().find(String(this.params.booking))

    if (!booking) throw new RequestException('Booking not found.', 404)

    return booking
  }

  private async summary(booking: Booking, message: string) {
    return new GenericResource(await new ProofSummary(booking).for(this.user).data()).additional({ status: 'success', message, code: 200 })
  }
}
