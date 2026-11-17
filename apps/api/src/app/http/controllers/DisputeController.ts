import { Booking } from '@app/models/Booking'
import { Dispute } from '@app/models/Dispute'
import { DisputeCollection } from '@app/http/resources/DisputeCollection'
import { BookingPolicy } from '@app/policies/BookingPolicy'
import { Disputes } from '@app/services/Disputes'
import { BaseController } from './BaseController'
import { GenericResource } from 'resora'
import { RequestException } from '@arkstack/common'

/** Raising a dispute about a booking, for anyone on it. */
export default class DisputeController extends BaseController {
  async store() {
    const booking = await Booking.query().find(String(this.params.booking))

    if (!booking || !(await BookingPolicy.talks(this.user, booking))) throw new RequestException('Booking not found.', 404)

    const data = await this.validate({ reason: `required|in:${Dispute.REASONS.join(',')}`, details: 'required|string|min:10|max:1000' })
    const dispute = await Disputes.open(booking, this.user, data.reason as Dispute['reason'], String(data.details))

    return new GenericResource(DisputeCollection.present(dispute, await DisputeCollection.names([dispute])))
      .additional({ status: 'success', message: 'Dispute raised. Staff will look into it.', code: 201 })
      .response()
      .setStatusCode(201)
  }
}
