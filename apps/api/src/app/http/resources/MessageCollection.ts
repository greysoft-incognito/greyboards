import { Board } from '@app/models/Board'
import type { Booking } from '@app/models/Booking'
import type { BookingMessage } from '@app/models/BookingMessage'
import { BookingShare } from '@app/models/BookingShare'
import { PrintJob } from '@app/models/PrintJob'
import { User } from '@app/models/User'
import { BoardPolicy } from '@app/policies/BoardPolicy'
import { Collection } from './Collection'

/** Which side of the booking someone is on, so each message can say who wrote it. */
export type MessageSide = 'advertiser' | 'board' | 'billposter' | 'staff'

/** A page of a booking's messages, with each author's name and side, loaded once per author. */
export class MessageCollection extends Collection {
  private booking!: Booking

  private viewer!: User

  of(booking: Booking, viewer: User): this {
    this.booking = booking
    this.viewer = viewer

    return this
  }

  data() {
    const messages = this.items() as BookingMessage[]
    const authors = this.authors(messages)

    return messages.map(async (message) => {
      const author = message.authorId ? (await authors).get(message.authorId) : undefined

      return MessageCollection.present(message, author ?? null, this.viewer)
    }) as never
  }

  /** One message as the API sends it. */
  static async present(message: BookingMessage, author: { name: string; avatarUrl: string | null; side: MessageSide } | null, viewer: User) {
    return {
      id: message.id,
      body: message.body,
      photo: message.photoPath ? { url: await message.photoUrl(), width: message.photoWidth, height: message.photoHeight } : null,
      author: author ? { id: message.authorId, ...author } : null,
      mine: message.authorId === viewer.id,
      createdAt: message.createdAt,
    }
  }

  /** Each author's name, photo and side of the booking. */
  private async authors(messages: BookingMessage[]) {
    const ids = [...new Set(messages.map((message) => message.authorId).filter((id): id is string => !!id))]
    const users = ids.length ? (await User.query().whereIn('id', ids).get()).all() : []
    const entries = await Promise.all(users.map(async (user) => [user.id, { name: user.name, avatarUrl: await user.avatarUrl(), side: await MessageCollection.side(this.booking, user) }] as const))

    return new Map(entries)
  }

  static async side(booking: Booking, user: User): Promise<MessageSide> {
    if (user.id === booking.advertiserId) return 'advertiser'
    if (booking.shared && (await BookingShare.query().where({ bookingId: booking.id, userId: user.id }).exists())) return 'advertiser'

    const board = await Board.query().find(booking.boardId)

    if (board && (await BoardPolicy.manages(user, board))) return 'board'
    if (await PrintJob.query().where({ bookingId: booking.id, billposterId: user.id }).exists()) return 'billposter'

    return 'staff'
  }
}
