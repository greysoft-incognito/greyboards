import { Model } from '@arkstack/database'
import { Storage } from '@arkstack/filesystem'
import { abortIf } from '@arkstack/common'
import { raw, type QueryBuilder } from 'arkormx'
import { AvailabilityBlock } from './AvailabilityBlock'
import { BoardAgreement } from './BoardAgreement'
import { BoardFace } from './BoardFace'
import { BoardPhoto, type BoardPhotoInput } from './BoardPhoto'
import { OwnerProfile } from './OwnerProfile'
import { User, type UploadedFile } from './User'
import { Settings } from '@app/support/Settings'

export type BoardKind = 'billboard' | 'unipole' | 'gantry' | 'wall' | 'digital' | 'street_pole' | 'bus_shelter'

export type BoardStatus = 'pending' | 'listed' | 'rejected' | 'unlisted'

export type BoardRatePeriod = 'week' | 'month'

export interface BoardKindDefinition {
  kind: BoardKind
  label: string
}

/** A rectangle of the map, in degrees. */
export interface BoundingBox {
  west: number
  south: number
  east: number
  north: number
}

/** What a scout or owner writes down when they tag a board. */
export interface BoardDetails {
  name: string
  description?: string | null
  kind: BoardKind
  widthM: number
  heightM: number
  faces?: number
  facing?: string | null
  /** Compass direction the board's face points, 0 to 359 from true north. */
  headingDeg?: number | null
  lit?: boolean
  address?: string | null
  city?: string | null
  country?: string | null
  latitude: number
  longitude: number
  accuracyM?: number | null
  rateMinor?: number | null
  currency?: string
  ratePeriod?: BoardRatePeriod
  /** The owner, or their scout, prints and puts up booked ads instead of a dispatcher. */
  printsOwn?: boolean
  /** What they charge for that, in minor units. Null uses the standard print price. */
  printFeeMinor?: number | null
  /** The rate entered is what the owner receives; the listed rate adds the other shares on top. */
  ownerNet?: boolean
}

/** What an advertiser narrows the map down to. */
export interface BoardFilters {
  kind?: BoardKind | null
  lit?: boolean | null
  maxRateMinor?: number | null
}

/** A board as a point on the map, with just enough to draw and label it. */
export interface BoardPin {
  id: string
  name: string
  kind: BoardKind
  latitude: number
  longitude: number
  lit: boolean
  rateMinor: number | null
  currency: string
  ratePeriod: BoardRatePeriod
}

/** Who owns a board being tagged: a profile picked from the suggestions, or a new owner's name and phone. */
export interface BoardOwnerChoice {
  ownerProfileId?: string | null
  ownerName?: string | null
  ownerPhone?: string | null
}

/**
 * An advertising board at a place on the map. Scouts tag boards they find and owners
 * tag their own; a reviewer checks each one before it is listed for advertisers. The
 * `location` column is a PostGIS point the database keeps in step with the coordinates.
 */
export class Board extends Model {
  declare id: string
  declare name: string
  declare description: string | null
  declare kind: BoardKind
  declare widthM: number
  declare heightM: number
  declare faces: number
  declare facing: string | null
  declare headingDeg: number | null
  declare lit: boolean
  declare address: string | null
  declare city: string | null
  declare country: string | null
  declare latitude: number
  declare longitude: number
  declare accuracyM: number | null
  /** Whether the tagger fixed what the owner receives, so the listed rate is grossed up from `ownerRateMinor`. */
  declare ownerNet: boolean
  /** The owner's amount per period, when `ownerNet` is on. */
  declare ownerRateMinor: string | number | null
  declare rateMinor: string | number | null
  declare currency: string
  declare ratePeriod: BoardRatePeriod
  declare printsOwn: boolean
  /** Running totals of advertisers' ratings, for the average. */
  declare ratingSum: number
  declare ratingCount: number
  declare printFeeMinor: string | number | null
  declare status: BoardStatus
  declare reviewNote: string | null
  /** The nearest board facing a similar way when this one was tagged, for reviewers to compare. */
  declare duplicateOfId: string | null
  declare ownerProfileId: string | null
  declare taggedById: string | null
  declare reviewedById: string | null
  declare reviewedAt: Date | null
  declare createdAt: Date
  declare updatedAt: Date
  /** Metres from the search point, on boards found with `near`. */
  declare distanceM?: number | null

  static readonly PENDING: BoardStatus = 'pending'
  static readonly LISTED: BoardStatus = 'listed'
  static readonly REJECTED: BoardStatus = 'rejected'
  static readonly UNLISTED: BoardStatus = 'unlisted'

  static readonly STATUSES: BoardStatus[] = ['pending', 'listed', 'rejected', 'unlisted']

  static readonly PERIODS: BoardRatePeriod[] = ['week', 'month']

  static readonly KINDS: BoardKindDefinition[] = [
    { kind: 'billboard', label: 'Billboard' },
    { kind: 'unipole', label: 'Unipole' },
    { kind: 'gantry', label: 'Gantry' },
    { kind: 'wall', label: 'Wall drape' },
    { kind: 'digital', label: 'Digital screen' },
    { kind: 'street_pole', label: 'Lamp post' },
    { kind: 'bus_shelter', label: 'Bus shelter' },
  ]

  /** Degrees apart two boards may face and still count as facing the same way. */
  static readonly SAME_HEADING_DEG = 45

  /** Photos kept per board. */
  static readonly MAX_PHOTOS = 12

  /** Pins sent for one view of the map. Past this the map asks people to zoom in. */
  static readonly MAX_PINS = 500

  /** The farthest a nearby search reaches, in kilometres. */
  static readonly MAX_RADIUS_KM = 100

  /** Changing any of these on a listed board sends it back for review. */
  private static readonly REVIEWED_FIELDS: (keyof BoardDetails)[] = ['kind', 'widthM', 'heightM', 'latitude', 'longitude']

  protected static override table = 'boards'

  protected static override columns = {
    widthM: 'width_m',
    heightM: 'height_m',
    accuracyM: 'accuracy_m',
    headingDeg: 'heading_deg',
    rateMinor: 'rate_minor',
    ownerNet: 'owner_net',
    ownerRateMinor: 'owner_rate_minor',
    ratePeriod: 'rate_period',
    printsOwn: 'prints_own',
    ratingSum: 'rating_sum',
    ratingCount: 'rating_count',
    printFeeMinor: 'print_fee_minor',
    reviewNote: 'review_note',
    duplicateOfId: 'duplicate_of_id',
    ownerProfileId: 'owner_profile_id',
    taggedById: 'tagged_by_id',
    reviewedById: 'reviewed_by_id',
    reviewedAt: 'reviewed_at',
  }

  protected override hidden = ['location']

  static kinds(): BoardKind[] {
    return Board.KINDS.map((definition) => definition.kind)
  }

  static kindLabel(kind: BoardKind): string {
    return Board.KINDS.find((definition) => definition.kind === kind)?.label ?? kind
  }

  /**
   * Record a board `user` found, and wait for review. An owner tags it under one of the
   * profiles they manage (their own by default). A scout picks the owner from the
   * suggestions or gives a new owner's name and phone, which makes a profile for them.
   */
  static async tag(user: User, details: BoardDetails, owner: BoardOwnerChoice, asOwner: boolean): Promise<Board> {
    const profile = await Board.ownerFor(user, owner, asOwner)

    const duplicate = (await Board.possibleDuplicates(details.latitude, details.longitude, details.headingDeg ?? null))[0]
    const board = await Board.query().create({
      ...Board.clean(details),
      status: Board.PENDING,
      taggedById: user.id,
      ownerProfileId: profile.id,
      duplicateOfId: duplicate?.id ?? null,
    })

    await board.syncFaces()

    return board
  }

  /**
   * Boards already tagged near a spot and facing a similar way, nearest first, so a scout
   * sees them before tagging the same board again. Rejected tags don't count.
   */
  static async possibleDuplicates(latitude: number, longitude: number, headingDeg: number | null, exceptId?: string): Promise<Board[]> {
    const radiusM = await Settings.number('partners.duplicate_radius_m')
    const query = Board.query().whereRaw('status <> ?', [Board.REJECTED]).scope('near', Number(latitude), Number(longitude), radiusM / 1000)

    if (exceptId) query.whereRaw('id <> ?', [exceptId])

    const nearby = (await query.limit(10).get()).all()

    return nearby.filter((board) => Board.facesSameWay(board.headingDeg, headingDeg)).slice(0, 5)
  }

  /** Whether two headings are close enough to be the same face. An unknown heading could be either. */
  static facesSameWay(first: number | null, second: number | null): boolean {
    if (first === null || first === undefined || second === null || second === undefined) return true

    const apart = Math.abs(Number(first) - Number(second)) % 360

    return Math.min(apart, 360 - apart) <= Board.SAME_HEADING_DEG
  }

  private static async ownerFor(user: User, owner: BoardOwnerChoice, asOwner: boolean): Promise<OwnerProfile> {
    if (asOwner) return owner.ownerProfileId ? OwnerProfile.managedBy(user, owner.ownerProfileId) : OwnerProfile.personal(user)

    if (owner.ownerProfileId) {
      const profile = await OwnerProfile.query().find(owner.ownerProfileId)

      abortIf(!profile, 'That owner profile no longer exists. Pick the owner again.', 422)

      return profile!
    }

    abortIf(!owner.ownerPhone?.trim(), 'Add the board owner’s phone number so we can reach them.', 422)

    return OwnerProfile.findOrCreate(user, owner.ownerName ?? '', owner.ownerPhone!)
  }

  /** Trimmed details with empty text stored as null. */
  private static clean(details: Partial<BoardDetails>): Partial<BoardDetails> {
    const cleaned: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(details)) {
      if (value === undefined) continue

      cleaned[key] = typeof value === 'string' ? value.trim() || null : value
    }

    if (typeof cleaned.country === 'string') cleaned.country = cleaned.country.toUpperCase()
    if (typeof cleaned.currency === 'string') cleaned.currency = cleaned.currency.toUpperCase()

    return cleaned as Partial<BoardDetails>
  }

  ownerProfile() {
    return this.belongsTo(OwnerProfile, 'ownerProfileId')
  }

  tagger() {
    return this.belongsTo(User, 'taggedById')
  }

  reviewer() {
    return this.belongsTo(User, 'reviewedById')
  }

  photos() {
    return this.hasMany(BoardPhoto, 'boardId')
  }

  /** The board's faces, A first. */
  boardFaces() {
    return this.hasMany(BoardFace, 'boardId').oldest('position')
  }

  /** Days the owner keeps for themselves. */
  availabilityBlocks() {
    return this.hasMany(AvailabilityBlock, 'boardId')
  }

  /** Agreements sent to the owner of a scouted board, newest last. */
  agreements() {
    return this.hasMany(BoardAgreement, 'boardId')
  }

  /** The agreement that counts: the signed one, else the latest sent. */
  async agreement(): Promise<BoardAgreement | null> {
    const signed = await this.agreements().where({ status: BoardAgreement.SIGNED }).first()

    return signed ?? (await this.agreements().latest('createdAt').first())
  }

  scopeListed(query: QueryBuilder<Board>): QueryBuilder<Board> {
    return query.where({ status: Board.LISTED })
  }

  scopeWithStatus(query: QueryBuilder<Board>, status: BoardStatus): QueryBuilder<Board> {
    return query.where({ status })
  }

  /** Boards that pass an advertiser's filters. A board with no rate yet never passes a price limit. */
  scopeFiltered(query: QueryBuilder<Board>, filters: BoardFilters): QueryBuilder<Board> {
    if (filters.kind) query.where({ kind: filters.kind })
    if (typeof filters.lit === 'boolean') query.where({ lit: filters.lit })
    if (filters.maxRateMinor !== null && filters.maxRateMinor !== undefined) query.whereRaw('rate_minor <= ?', [filters.maxRateMinor])

    return query
  }

  /**
   * Listed boards inside `box` as map pins, at most `MAX_PINS`. `truncated` says there were
   * more, so the map can ask for a closer look instead of showing a random few.
   */
  static async pins(box: BoundingBox, filters: BoardFilters): Promise<{ pins: BoardPin[]; truncated: boolean }> {
    const rows = await Board.scope('listed')
      .scope('within', box)
      .scope('filtered', filters)
      .latest('createdAt')
      .limit(Board.MAX_PINS + 1)
      .get()

    const boards = rows.all().slice(0, Board.MAX_PINS)

    return {
      truncated: rows.all().length > Board.MAX_PINS,
      pins: boards.map((board) => ({
        id: board.id,
        name: board.name,
        kind: board.kind,
        latitude: Number(board.latitude),
        longitude: Number(board.longitude),
        lit: board.lit,
        rateMinor: board.rate(),
        currency: board.currency,
        ratePeriod: board.ratePeriod,
      })),
    }
  }

  /** Boards `user` owns or tagged. */
  scopeManagedBy(query: QueryBuilder<Board>, user: User): QueryBuilder<Board> {
    return query.where((match: QueryBuilder<Board>) =>
      match.where({ taggedById: user.id }).orWhereRaw('owner_profile_id in (select id from owner_profiles where user_id = ?)', [user.id]),
    )
  }

  /** Boards inside `box`. A box that crosses the date line wraps around it. */
  scopeWithin(query: QueryBuilder<Board>, box: BoundingBox): QueryBuilder<Board> {
    query.whereRaw('latitude between ? and ?', [box.south, box.north])

    if (box.west <= box.east) return query.whereRaw('longitude between ? and ?', [box.west, box.east])

    return query.whereRaw('(longitude >= ? or longitude <= ?)', [box.west, box.east])
  }

  /** Boards within `radiusKm` of a point, nearest first, each with its `distanceM`. */
  scopeNear(query: QueryBuilder<Board>, latitude: number, longitude: number, radiusKm: number): QueryBuilder<Board> {
    const point = 'ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography'

    return query
      .addSelect({ distance_m: raw(`ST_Distance(location, ${point})`, [longitude, latitude]) })
      .whereRaw(`ST_DWithin(location, ${point}, ?)`, [longitude, latitude, radiusKm * 1000])
      .orderByRaw(`location <-> ${point}`, [longitude, latitude], 'asc')
  }

  kindLabel(): string {
    return Board.kindLabel(this.kind)
  }

  isListed(): boolean {
    return this.status === Board.LISTED
  }

  /** The rate in minor units, as a number. Postgres hands big integers back as text. */
  rate(): number | null {
    return this.rateMinor === null || this.rateMinor === undefined ? null : Number(this.rateMinor)
  }

  /** The owner's fixed amount per period, or null when the board doesn't fix it. */
  ownerRate(): number | null {
    return this.ownerRateMinor === null || this.ownerRateMinor === undefined ? null : Number(this.ownerRateMinor)
  }

  /** Save edits from the owner or tagger. A rejected board, or a listed one whose place or size changed, goes back for review. */
  async revise(details: Partial<BoardDetails>): Promise<void> {
    const changes = Board.clean(details)
    const moved = Board.REVIEWED_FIELDS.some((field) => field in changes && changes[field] !== this[field as keyof this])
    const resubmit = this.status === Board.REJECTED || (this.isListed() && moved)

    if (changes.faces !== undefined && changes.faces < this.faces) await this.checkFacesFree(changes.faces)

    await this.update(resubmit ? { ...changes, status: Board.PENDING, reviewNote: null } : changes)
    await this.syncFaces()
  }

  /**
   * Make the face rows match the board's face count: add missing faces after the last,
   * drop faces past it. The first face starts with the board's heading.
   */
  async syncFaces(): Promise<void> {
    const count = Math.max(1, Number(this.faces) || 1)
    const faces = (await this.boardFaces().getResults()).all()

    for (let position = faces.length + 1; position <= count; position++) {
      await BoardFace.query().create({
        boardId: this.id,
        position,
        label: BoardFace.labelFor(position),
        headingDeg: position === 1 ? this.headingDeg : null,
        minPeriods: 1,
      })
    }

    await BoardFace.query().where({ boardId: this.id }).whereRaw('position > ?', [count]).delete()
  }

  /** Refuse to drop faces that still have bookings to run. */
  private async checkFacesFree(count: number): Promise<void> {
    const booked = await BoardFace.query()
      .where({ boardId: this.id })
      .whereRaw("position > ? and exists (select 1 from bookings where bookings.face_id = board_faces.id and bookings.status in ('held', 'paid', 'live'))", [count])
      .exists()

    abortIf(booked, 'A face you are removing still has bookings. Keep it until they end.', 422)
  }

  /**
   * The face an advertiser books. A board with one face needs no choice; on others they
   * pick one, and it must belong to this board.
   */
  async faceFor(faceId?: string | null): Promise<BoardFace> {
    const faces = (await this.boardFaces().getResults()).all()
    const face = faceId ? faces.find((candidate) => candidate.id === faceId) : faces.length === 1 ? faces[0] : undefined

    abortIf(!face, faceId ? 'That face isn’t on this board.' : 'Pick which face of the board to book.', 422)

    return face!
  }

  /** What a face costs per week or month: its own rate, else the board's. */
  rateFor(face: BoardFace): number | null {
    return face.ownRate() ?? this.rate()
  }

  /** Record a reviewer's decision. Pending is not a decision. */
  async review(reviewer: User, status: BoardStatus, note?: string | null): Promise<void> {
    abortIf(status === Board.PENDING, 'Pick listed, rejected or unlisted.', 422)
    const profile = await this.ownerProfile().first()

    abortIf(reviewer.id === this.taggedById || profile?.isManagedBy(reviewer), 'You cannot review a board you tagged or own.', 422)

    await this.update({ status, reviewNote: note?.trim() || null, reviewedById: reviewer.id, reviewedAt: new Date() })
  }

  /** Store a photo `user` took of the board, with where they stood. */
  async addPhoto(user: User, file: UploadedFile, input: BoardPhotoInput): Promise<BoardPhoto> {
    const count = await this.photos().count()

    abortIf(count >= Board.MAX_PHOTOS, `A board can have up to ${Board.MAX_PHOTOS} photos. Remove one first.`, 422)

    return BoardPhoto.store(this, user, file, input)
  }

  /** Delete the board and its photo files. */
  async remove(): Promise<void> {
    const photos = (await this.photos().getResults()).all()

    await this.delete()

    for (const photo of photos) {
      await Storage.disk(photo.disk as never)
        .delete(photo.path)
        .catch(() => undefined)
    }
  }
}
