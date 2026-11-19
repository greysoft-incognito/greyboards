import { Model } from '@arkstack/database'
import { abortIf } from '@arkstack/common'
import { createHash, randomBytes } from 'node:crypto'
import { AgreementWording, type AgreementTerms, type AgreementValues } from '@app/support/AgreementWording'
import { Reputation } from '@app/services/Reputation'
import { PhoneCode } from '@app/support/PhoneCode'
import { Settings } from '@app/support/Settings'
import { Sms } from '@app/support/Sms'
import { Board, type BoardRatePeriod } from './Board'
import { OwnerProfile } from './OwnerProfile'
import { User } from './User'

export type BoardAgreementStatus = 'sent' | 'signed' | 'declined' | 'cancelled'

/** Who signed and from where, kept with the signature. */
export interface SigningContext {
  ip?: string | null
  userAgent?: string | null
}

/**
 * The agreement a board owner signs when a scout runs their board for them. Most owners
 * are offline, so it reaches them by SMS: a link to read the terms, then a code to sign.
 * The terms (owner share, rate and the wording) are copied in when it is sent, so later
 * changes to the board, the share setting or the wording don't change what was signed.
 */
export class BoardAgreement extends Model {
  declare id: string
  declare boardId: string
  declare ownerProfileId: string
  declare sentById: string | null
  declare ownerName: string | null
  declare ownerPhone: string
  declare ownerSharePercent: number
  declare rateMinor: string | number | null
  declare currency: string
  declare ratePeriod: BoardRatePeriod
  declare status: BoardAgreementStatus
  declare tokenHash: string
  declare expiresAt: Date
  declare sendCount: number
  declare lastSentAt: Date
  declare signedName: string | null
  declare signedAt: Date | null
  declare signedIp: string | null
  declare signedUserAgent: string | null
  declare declinedAt: Date | null
  /** The wording the owner reads, as it was when the agreement was sent. Older agreements have none. */
  declare terms: AgreementTerms | null
  declare createdAt: Date
  declare updatedAt: Date

  static readonly SENT: BoardAgreementStatus = 'sent'
  static readonly SIGNED: BoardAgreementStatus = 'signed'
  static readonly DECLINED: BoardAgreementStatus = 'declined'
  static readonly CANCELLED: BoardAgreementStatus = 'cancelled'

  /** Times the link can be sent for one agreement. */
  static readonly MAX_SENDS = 5

  /** Seconds between two texts of the link. */
  static readonly RESEND_SECONDS = 60

  protected static override table = 'board_agreements'

  protected static override columns = {
    boardId: 'board_id',
    ownerProfileId: 'owner_profile_id',
    sentById: 'sent_by_id',
    ownerName: 'owner_name',
    ownerPhone: 'owner_phone',
    ownerSharePercent: 'owner_share_percent',
    rateMinor: 'rate_minor',
    ratePeriod: 'rate_period',
    tokenHash: 'token_hash',
    expiresAt: 'expires_at',
    sendCount: 'send_count',
    lastSentAt: 'last_sent_at',
    signedName: 'signed_name',
    signedAt: 'signed_at',
    signedIp: 'signed_ip',
    signedUserAgent: 'signed_user_agent',
    declinedAt: 'declined_at',
  }

  protected override hidden = ['tokenHash']

  protected override casts = {
    terms: 'json',
  } as never

  private static hash(value: string): string {
    return createHash('sha256').update(value).digest('hex')
  }

  /**
   * Text the owner of a scouted board a link to sign. An agreement already waiting is sent
   * again with a fresh link; anything else waiting for the board is cancelled.
   */
  static async offer(board: Board, sender: User): Promise<BoardAgreement> {
    const profile = await board.ownerProfile().first()

    abortIf(!profile, 'Pick the board’s owner first.', 422)
    abortIf(!!profile!.userId && profile!.userId === board.taggedById, 'You own this board, so there’s nothing to sign.', 422)
    abortIf(!profile!.phone, 'Add the owner’s phone number first.', 422)
    abortIf(await board.agreements().where({ status: BoardAgreement.SIGNED }).exists(), 'The owner has already signed for this board.', 422)

    const open = await board.agreements().where({ status: BoardAgreement.SENT }).latest('createdAt').first()
    const token = randomBytes(24).toString('base64url')
    const expiresAt = new Date(Date.now() + (await Settings.number('agreements.link_days')) * 86_400_000)

    if (open && open.ownerPhone === profile!.phone) {
      abortIf(open.sendCount >= BoardAgreement.MAX_SENDS, 'The link has been sent too many times. Try calling the owner instead.', 429)
      abortIf(open.secondsUntilResend() > 0, `Wait ${open.secondsUntilResend()} seconds before sending it again.`, 429)

      await open.update({ tokenHash: BoardAgreement.hash(token), expiresAt, sendCount: open.sendCount + 1, lastSentAt: new Date() })
      await open.text(board, sender, token)

      return open
    }

    if (open) await open.update({ status: BoardAgreement.CANCELLED })

    const ownerSharePercent = await Settings.number('revenue.owner_percent')
    const rateMinor = board.rate()
    const terms = await AgreementWording.terms({
      owner: profile!.name,
      scout: sender.name,
      board: board.name,
      share: ownerSharePercent,
      rate: rateMinor === null ? null : { amountMinor: Number(rateMinor), currency: board.currency, period: board.ratePeriod },
    })
    const agreement = await BoardAgreement.query().create({
      boardId: board.id,
      sentById: sender.id,
      ownerProfileId: profile!.id,
      ownerName: profile!.name,
      ownerPhone: profile!.phone!,
      ownerSharePercent,
      rateMinor,
      currency: board.currency,
      ratePeriod: board.ratePeriod,
      status: BoardAgreement.SENT,
      tokenHash: BoardAgreement.hash(token),
      expiresAt,
      sendCount: 1,
      lastSentAt: new Date(),
      terms,
    })

    await agreement.text(board, sender, token)

    return agreement
  }

  /** The agreement a signing link points to, or a 404. */
  static async fromToken(token: string): Promise<BoardAgreement> {
    const agreement = await BoardAgreement.query().where({ tokenHash: BoardAgreement.hash(token) }).first()

    abortIf(!agreement, 'This link doesn’t work. Ask your scout to send a new one.', 404)

    return agreement!
  }

  board() {
    return this.belongsTo(Board, 'boardId')
  }

  ownerProfile() {
    return this.belongsTo(OwnerProfile, 'ownerProfileId')
  }

  sender() {
    return this.belongsTo(User, 'sentById')
  }

  rate(): number | null {
    return this.rateMinor === null || this.rateMinor === undefined ? null : Number(this.rateMinor)
  }

  /** Waiting for the owner, with a link that still works. */
  isOpen(): boolean {
    return this.status === BoardAgreement.SENT && this.expiresAt.getTime() > Date.now()
  }

  /** What the owner and the scout see: an unsigned agreement whose link ran out shows as expired. */
  displayStatus(): BoardAgreementStatus | 'expired' {
    return this.status === BoardAgreement.SENT && !this.isOpen() ? 'expired' : this.status
  }

  secondsUntilResend(): number {
    return Math.max(0, Math.ceil((this.lastSentAt.getTime() + BoardAgreement.RESEND_SECONDS * 1000 - Date.now()) / 1000))
  }

  /** The code the owner signs with, texted to the number the agreement went to. */
  private code(): PhoneCode {
    return new PhoneCode(this.ownerPhone, `agreement:${this.id}`)
  }

  /** Text the owner a code to sign with. */
  async sendCode(): Promise<void> {
    this.assertOpen()

    await this.code().send((code) => `Your Greyboards code is ${code}. It works for ${PhoneCode.MINUTES} minutes. Don't share it with anyone.`)
  }

  /** Sign with the texted code. An unclaimed owner profile takes the name the owner signed with. */
  async sign(code: string, name: string, context: SigningContext = {}): Promise<void> {
    this.assertOpen()

    await this.code().verify(code)
    await this.update({
      status: BoardAgreement.SIGNED,
      signedName: name.trim(),
      signedAt: new Date(),
      signedIp: context.ip ?? null,
      signedUserAgent: context.userAgent?.slice(0, 191) ?? null,
    })

    const profile = await this.ownerProfile().first()

    if (profile) await profile.update({ phoneVerifiedAt: new Date(), ...(profile.isClaimed() ? {} : { name: name.trim() }) })

    await Reputation.award(this.sentById, 'scout', 'signed', this.boardId)
  }

  async decline(): Promise<void> {
    this.assertOpen()

    await this.update({ status: BoardAgreement.DECLINED, declinedAt: new Date() })
  }

  private assertOpen(): void {
    abortIf(this.status === BoardAgreement.SIGNED, 'This agreement is already signed.', 422)
    abortIf(!this.isOpen(), 'This link has expired. Ask your scout to send a new one.', 410)
  }

  /** What the placeholders in the wording are filled with for this agreement. */
  values(board: Board, sender: User | null): AgreementValues {
    const rate = this.rate()

    return {
      owner: this.ownerName,
      scout: sender?.name ?? null,
      board: board.name,
      share: this.ownerSharePercent,
      rate: rate === null ? null : { amountMinor: rate, currency: this.currency, period: this.ratePeriod },
    }
  }

  /** The wording the owner reads: what was sent, or for older agreements, today's wording. */
  async wording(board: Board, sender: User | null): Promise<AgreementTerms> {
    return this.terms ?? AgreementWording.terms(this.values(board, sender))
  }

  private async text(board: Board, sender: User, token: string): Promise<void> {
    const link = `${config('app.frontend_url')}/agreements/${token}`

    await Sms.send(this.ownerPhone, await AgreementWording.sms(this.values(board, sender), link))
  }
}
