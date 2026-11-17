import { Booking } from '@app/models/Booking'
import { MessageCollection } from '@app/http/resources/MessageCollection'
import { BookingPolicy } from '@app/policies/BookingPolicy'
import { Messages } from '@app/services/Messages'
import { imageFile } from '@app/support/rules'
import { Settings } from '@app/support/Settings'
import { BaseController } from './BaseController'
import { GenericResource } from 'resora'
import { RequestException, perPage } from '@arkstack/common'

/** Messages about a booking between the advertiser, whoever looks after the board and the dispatcher. */
export default class MessageController extends BaseController {
  /** A page of messages, newest first. Reading them marks the booking read. */
  async index() {
    const booking = await this.booking()
    const messages = await Messages.page(booking).paginate(perPage(this.query, { perPage: 30, maxPerPage: 100 }))

    await Messages.markRead(booking, this.user)

    return new MessageCollection(messages).of(booking, this.user).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async store() {
    const booking = await this.booking()
    const data = await this.validate({
      body: `nullable|string|max:${await Settings.number('messages.max_length')}`,
      photo: ['nullable', ...imageFile((await Settings.number('uploads.max_image_mb')) * 1024).filter((rule) => rule !== 'required')] as never,
    })

    const message = await Messages.post(booking, this.user, data.body ? String(data.body) : null, data.photo ?? null)
    const author = { name: this.user.name, avatarUrl: await this.user.avatarUrl(), side: await MessageCollection.side(booking, this.user) }

    return new GenericResource(await MessageCollection.present(message, author, this.user)).additional({ status: 'success', message: 'Sent.', code: 201 }).response().setStatusCode(201)
  }

  /** The booking in the address, if the account takes part in it. */
  private async booking(): Promise<Booking> {
    const booking = await Booking.query().find(String(this.params.booking))

    if (!booking || !(await BookingPolicy.talks(this.user, booking))) throw new RequestException('Booking not found.', 404)

    return booking
  }
}
