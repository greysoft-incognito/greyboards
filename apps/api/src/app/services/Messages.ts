import { abortIf } from '@arkstack/common'
import { Board } from '@app/models/Board'
import type { Booking } from '@app/models/Booking'
import { BookingMessage } from '@app/models/BookingMessage'
import { BookingMessageRead } from '@app/models/BookingMessageRead'
import { OwnerProfile } from '@app/models/OwnerProfile'
import type { UploadedFile, User } from '@app/models/User'
import { Settings } from '@app/support/Settings'
import { Sms } from '@app/support/Sms'
import { StoredImage } from '@app/support/StoredImage'

/**
 * Messages about a booking, so what was agreed and the evidence stay with it. Owners whose
 * board a scout runs, and who have no account, get each new message by SMS.
 */
export class Messages {
  /** Characters of a message quoted in an SMS. */
  static readonly SMS_PREVIEW = 120

  /** Post a message, a photo, or both. Posting marks the booking read for the author. */
  static async post(booking: Booking, author: User, body: string | null, photo: UploadedFile | null): Promise<BookingMessage> {
    const text = body?.trim() || null
    const maxLength = await Settings.number('messages.max_length')

    abortIf(!text && !photo, 'Write a message or add a photo.', 422)
    abortIf(!!text && text.length > maxLength, `Messages can be up to ${maxLength} characters.`, 422)

    const saved = photo ? await StoredImage.save(`bookings/${booking.id}/messages`, photo) : null
    const message = await BookingMessage.query().create({
      bookingId: booking.id,
      authorId: author.id,
      body: text,
      photoPath: saved?.path ?? null,
      photoDisk: saved?.disk ?? null,
      photoWidth: saved?.width ?? null,
      photoHeight: saved?.height ?? null,
    })

    await Messages.markRead(booking, author)
    await Messages.textOwner(booking, author, text)

    return message
  }

  /** A page of a booking's messages, newest first. */
  static page(booking: Booking) {
    return BookingMessage.query().where({ bookingId: booking.id }).latest('createdAt')
  }

  static async markRead(booking: Booking, user: User): Promise<void> {
    const read = await BookingMessageRead.query().where({ bookingId: booking.id, userId: user.id }).first()

    if (read) await read.update({ readAt: new Date() })
    else await BookingMessageRead.query().create({ bookingId: booking.id, userId: user.id, readAt: new Date() })
  }

  /** How many messages others posted since `user` last read the booking's, and how many there are. */
  static async counts(booking: Booking, user: User): Promise<{ total: number; unread: number }> {
    const read = await BookingMessageRead.query().where({ bookingId: booking.id, userId: user.id }).first()
    const total = await BookingMessage.query().where({ bookingId: booking.id }).count()
    const unread = await BookingMessage.query()
      .where({ bookingId: booking.id })
      .whereRaw('(author_id is null or author_id <> ?)', [user.id])
      .when(!!read, (query) => query.whereRaw('"createdAt" > ?', [read!.readAt]))
      .count()

    return { total, unread }
  }

  /** Text the owner of a scout-run board who has no account, so they can follow along. */
  private static async textOwner(booking: Booking, author: User, text: string | null): Promise<void> {
    if (!(await Settings.get('messages.sms_owners')) || !booking.ownerProfileId) return

    const profile = await OwnerProfile.query().find(booking.ownerProfileId)
    const board = await Board.query().find(booking.boardId)

    if (!profile?.phone || profile.userId || !board) return

    const preview = text ? (text.length > Messages.SMS_PREVIEW ? `${text.slice(0, Messages.SMS_PREVIEW - 1)}…` : text) : 'a photo'

    await Sms.send(profile.phone, `${author.name} about the ad on "${board.name}": ${preview} - Greyboards`).catch(() => undefined)
  }
}
