import { Model } from '@arkstack/database'
import type { UploadedFile, User } from './User'
import { StoredImage } from '@app/support/StoredImage'

export type IdentityDocument = 'nin' | 'passport' | 'drivers_licence' | 'voters_card'

/** `submitted` until a reviewer looks, then `verified` or `rejected`. */
export type IdentityStatus = 'submitted' | 'verified' | 'rejected'

export interface IdentityInput {
  documentType: IdentityDocument
  documentNumber: string
  fullName: string
}

/**
 * A photo of a scout's or billposter's government ID, checked by a reviewer before they
 * are let in. One per account; sending a new one replaces it and asks for a fresh look.
 */
export class IdentityCheck extends Model {
  declare id: string
  declare userId: string
  declare documentType: IdentityDocument
  declare documentNumber: string
  declare fullName: string
  declare photoPath: string
  declare photoDisk: string
  declare status: IdentityStatus
  declare note: string | null
  declare reviewedById: string | null
  declare reviewedAt: Date | null
  declare createdAt: Date
  declare updatedAt: Date

  static readonly DOCUMENTS: { type: IdentityDocument; label: string }[] = [
    { type: 'nin', label: 'National ID (NIN slip or card)' },
    { type: 'passport', label: 'International passport' },
    { type: 'drivers_licence', label: 'Driver’s licence' },
    { type: 'voters_card', label: 'Voter’s card' },
  ]

  protected static override table = 'identity_checks'

  protected static override columns = {
    userId: 'user_id',
    documentType: 'document_type',
    documentNumber: 'document_number',
    fullName: 'full_name',
    photoPath: 'photo_path',
    photoDisk: 'photo_disk',
    reviewedById: 'reviewed_by_id',
    reviewedAt: 'reviewed_at',
  }

  static types(): IdentityDocument[] {
    return IdentityCheck.DOCUMENTS.map((document) => document.type)
  }

  static of(user: User): Promise<IdentityCheck | null> {
    return IdentityCheck.query().where({ userId: user.id }).first()
  }

  /** Save `user`'s ID for review, replacing what they sent before. */
  static async submit(user: User, input: IdentityInput, photo: UploadedFile): Promise<IdentityCheck> {
    const saved = await StoredImage.save(`identity/${user.id}`, photo)
    const existing = await IdentityCheck.of(user)
    const details = {
      documentType: input.documentType,
      documentNumber: input.documentNumber.replace(/\s+/g, '').toUpperCase(),
      fullName: input.fullName.trim().replace(/\s+/g, ' '),
      photoPath: saved.path,
      photoDisk: saved.disk,
      status: 'submitted' as IdentityStatus,
      note: null,
      reviewedById: null,
      reviewedAt: null,
    }

    if (!existing) return IdentityCheck.query().create({ userId: user.id, ...details })

    await StoredImage.remove(existing.photoDisk, existing.photoPath)
    await existing.update(details)

    return existing
  }

  /** A short-lived link to the photo, for the account and reviewers. */
  photoUrl(): Promise<string> {
    return StoredImage.url(this.photoDisk, this.photoPath)
  }

  /** The number with all but the last four hidden, for the account's own view. */
  maskedNumber(): string {
    return `${'•'.repeat(Math.max(0, this.documentNumber.length - 4))}${this.documentNumber.slice(-4)}`
  }

  async review(reviewer: User, status: Exclude<IdentityStatus, 'submitted'>, note?: string | null): Promise<void> {
    await this.update({ status, note: note?.trim() || null, reviewedById: reviewer.id, reviewedAt: new Date() })
  }
}
