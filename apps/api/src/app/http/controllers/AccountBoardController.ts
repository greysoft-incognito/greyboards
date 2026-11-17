import { Board, type BoardDetails, type BoardOwnerChoice, type BoardStatus } from '@app/models/Board'
import { BoardAgreement } from '@app/models/BoardAgreement'
import { BoardAgreementResource } from '@app/http/resources/BoardAgreementResource'
import { BoardCollection } from '@app/http/resources/BoardCollection'
import { BoardPhotoResource } from '@app/http/resources/BoardPhotoResource'
import { BoardPolicy } from '@app/policies/BoardPolicy'
import { BaseController } from './BaseController'
import { GenericResource } from 'resora'
import { ManagedBoardResource } from '@app/http/resources/ManagedBoardResource'
import { RequestException, perPage } from '@arkstack/common'
import { Settings } from '@app/support/Settings'
import { UUID, imageFile } from '@app/support/rules'
import { regex } from 'kanun'

const PHONE = regex(/^\+?[0-9 ()-]{7,20}$/)

/** Every field the tag-a-board form sends. */
const rules = (creating: boolean) => {
  const need = creating ? 'required' : 'nullable'

  return {
    name: `${need}|string|max:120`,
    description: 'nullable|string|max:1000',
    kind: `${need}|in:${Board.kinds().join(',')}`,
    widthM: `${need}|numeric|min:0.5|max:100`,
    heightM: `${need}|numeric|min:0.5|max:100`,
    faces: 'nullable|integer|min:1|max:4',
    facing: 'nullable|string|max:60',
    lit: 'nullable|boolean',
    address: 'nullable|string|max:191',
    city: 'nullable|string|max:80',
    country: 'nullable|alpha|min:2|max:2',
    latitude: `${need}|numeric|min:-90|max:90`,
    longitude: `${need}|numeric|min:-180|max:180`,
    accuracyM: 'nullable|numeric|min:0|max:10000',
    rateMinor: 'nullable|integer|min:0',
    currency: 'nullable|alpha|min:3|max:3',
    ratePeriod: `nullable|in:${Board.PERIODS.join(',')}`,
    printsOwn: 'nullable|boolean',
    printFeeMinor: 'nullable|integer|min:0',
  }
}

/** Who owns a board being tagged: a suggested profile, or a new owner. */
const ownerRules = {
  ownerProfileId: ['nullable', UUID],
  ownerName: 'nullable|string|max:120',
  ownerPhone: ['nullable', 'string', PHONE],
}

const NUMBERS = ['widthM', 'heightM', 'faces', 'latitude', 'longitude', 'accuracyM', 'rateMinor', 'printFeeMinor'] as const

/** Only the fields that were sent, with numbers as numbers, so a missing field keeps what the board has. */
const details = (data: Record<string, any>, sent: Record<string, unknown>): Partial<BoardDetails> => {
  const picked: Record<string, unknown> = {}

  for (const key of Object.keys(rules(false))) {
    if (!(key in sent)) continue

    const value = data[key] ?? null

    picked[key] = value !== null && (NUMBERS as readonly string[]).includes(key) ? Number(value) : value
  }

  for (const flag of ['lit', 'printsOwn']) if (typeof picked[flag] === 'string') picked[flag] = ['1', 'true', 'on'].includes(picked[flag] as string)

  return picked as Partial<BoardDetails>
}

/** The boards the signed-in scout or owner tagged or owns. */
export default class AccountBoardController extends BaseController {
  async index() {
    const filters = await this.validateQuery({ status: `nullable|in:${Board.STATUSES.join(',')}` })
    const query = Board.scope('managedBy', this.user)

    if (filters.status) query.scope('withStatus', filters.status as BoardStatus)

    const boards = await query.latest('createdAt').paginate(perPage(this.query, { perPage: 25, maxPerPage: 100 }))

    return new BoardCollection(boards).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** Tag a board. `as` says whether the user owns it or scouted it. */
  async create() {
    const data = await this.validate({ ...rules(true), ...ownerRules, as: 'required|in:owner,scout' })
    const asOwner = data.as === 'owner'

    if (!(await this.user.actsAs(data.as))) throw new RequestException(`You need an active ${data.as} role to tag boards as ${data.as}.`, 403)

    const owner: BoardOwnerChoice = { ownerProfileId: data.ownerProfileId, ownerName: data.ownerName, ownerPhone: data.ownerPhone }
    const board = await Board.tag(this.user, details(data, this.body) as BoardDetails, owner, asOwner)

    return new ManagedBoardResource(board)
      .additional({ status: 'success', message: 'Board tagged. We’ll check it before it goes on the map.', code: 201 })
      .response()
      .setStatusCode(201)
  }

  async update() {
    const board = await this.managed()
    const data = await this.validate(rules(false))

    await board.revise(details(data, this.body))

    const message = board.status === Board.PENDING ? 'Saved. We’ll check the changes before it goes back on the map.' : 'Board saved'

    return new ManagedBoardResource(board).additional({ status: 'success', message, code: 200 })
  }

  async destroy() {
    const board = await this.managed()

    await board.remove()

    return new GenericResource({ id: board.id }).additional({ status: 'success', message: 'Board removed', code: 200 })
  }

  /** Add a photo, with where the phone was when it was taken. */
  async addPhoto() {
    const board = await this.managed()
    const data = await this.validate({
      photo: imageFile((await Settings.number('uploads.max_image_mb')) * 1024),
      latitude: 'nullable|numeric|min:-90|max:90',
      longitude: 'nullable|numeric|min:-180|max:180',
      accuracyM: 'nullable|numeric|min:0|max:10000',
      takenAt: 'nullable|date',
    })
    const located = data.latitude !== undefined && data.latitude !== null && data.longitude !== undefined && data.longitude !== null

    const photo = await board.addPhoto(this.user, data.photo, {
      latitude: located ? Number(data.latitude) : null,
      longitude: located ? Number(data.longitude) : null,
      accuracyM: located && data.accuracyM ? Number(data.accuracyM) : null,
      takenAt: data.takenAt ? new Date(data.takenAt) : null,
    })

    return new BoardPhotoResource(photo).of(board)
      .additional({ status: 'success', message: 'Photo added', code: 201 })
      .response()
      .setStatusCode(201)
  }

  async removePhoto() {
    const board = await this.managed()
    const photo = await board.photos().where({ id: String(this.params.photo) }).first()

    if (!photo) throw new RequestException('Photo not found.', 404)

    await photo.remove()

    return new GenericResource({ id: photo.id }).additional({ status: 'success', message: 'Photo removed', code: 200 })
  }

  /** Text the owner of a scouted board a link to sign, or send the waiting one again. */
  async sendAgreement() {
    const board = await this.managed()
    const agreement = await BoardAgreement.offer(board, this.user)

    return new BoardAgreementResource(agreement)
      .additional({ status: 'success', message: `Sent to ${agreement.ownerName ?? 'the owner'} by SMS.`, code: 201 })
      .response()
      .setStatusCode(201)
  }

  /** The board in the route, when the signed-in user looks after it. */
  private async managed(): Promise<Board> {
    const board = await Board.query().findOrFail(String(this.params.board))

    if (!(await BoardPolicy.manages(this.user, board))) throw new RequestException('Board not found.', 404)

    return board
  }
}
