import { Board, type BoardFilters, type BoardKind, type BoundingBox } from '@app/models/Board'
import { BoardCollection } from '@app/http/resources/BoardCollection'
import { BoardPolicy } from '@app/policies/BoardPolicy'
import { BaseController } from './BaseController'
import { GenericResource } from 'resora'
import { ManagedBoardResource } from '@app/http/resources/ManagedBoardResource'
import { RequestException, perPage } from '@arkstack/common'

/** Listed boards on the map, open to everyone. */
export default class BoardController extends BaseController {
  /** The kinds of board, for filters and forms. */
  async kinds() {
    return new GenericResource(Board.KINDS).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /**
   * Listed boards inside the map's bounds (`west`, `south`, `east`, `north`), or near a
   * point (`lat`, `lng`, `radiusKm`) with the nearest first. One page at a time.
   */
  async index() {
    const filters = await this.validateQuery({
      west: 'nullable|numeric|min:-180|max:180',
      south: 'nullable|numeric|min:-90|max:90',
      east: 'nullable|numeric|min:-180|max:180',
      north: 'nullable|numeric|min:-90|max:90',
      lat: 'nullable|numeric|min:-90|max:90',
      lng: 'nullable|numeric|min:-180|max:180',
      radiusKm: `nullable|numeric|min:0.1|max:${Board.MAX_RADIUS_KM}`,
      ...BoardController.FILTER_RULES,
    })

    const query = Board.scope('listed').scope('filtered', BoardController.filters(filters))
    const near = BoardController.given(filters.lat, filters.lng)
    const bounds = BoardController.given(filters.west, filters.south, filters.east, filters.north)

    if (near) {
      query.scope('near', Number(filters.lat), Number(filters.lng), Number(filters.radiusKm ?? 10))
    } else if (bounds) {
      query.scope('within', BoardController.box(filters)).latest('createdAt')
    } else {
      query.latest('createdAt')
    }

    const boards = await query.paginate(perPage(this.query, { perPage: 50, maxPerPage: 100 }))

    return new BoardCollection(boards).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** Every listed board inside the map's bounds as a light pin, up to `Board.MAX_PINS`. */
  async pins() {
    const filters = await this.validateQuery({
      west: 'required|numeric|min:-180|max:180',
      south: 'required|numeric|min:-90|max:90',
      east: 'required|numeric|min:-180|max:180',
      north: 'required|numeric|min:-90|max:90',
      ...BoardController.FILTER_RULES,
    })

    const { pins, truncated } = await Board.pins(BoardController.box(filters), BoardController.filters(filters))

    return new GenericResource(pins).additional({ meta: { truncated, max: Board.MAX_PINS }, status: 'success', message: 'OK', code: 200 })
  }

  async show() {
    const board = await Board.query().findOrFail(String(this.params.board))
    const viewer = await this.viewer()

    if (!(await BoardPolicy.view(viewer, board))) throw new RequestException('Board not found.', 404)

    return new ManagedBoardResource(board).withPrivate(await BoardPolicy.seesPrivate(viewer, board)).additional({ status: 'success', message: 'OK', code: 200 })
  }

  private static readonly FILTER_RULES = {
    kind: `nullable|in:${Board.kinds().join(',')}`,
    lit: 'nullable|in:true,false,1,0',
    maxRateMinor: 'nullable|integer|min:0',
    currency: 'nullable|alpha|min:3|max:3',
  }

  /** The advertiser's filters from a validated query. */
  private static filters(query: Record<string, unknown>): BoardFilters {
    return {
      kind: (query.kind as BoardKind) || null,
      lit: BoardController.given(query.lit) ? ['true', '1', true, 1].includes(query.lit as string) : null,
      maxRateMinor: BoardController.given(query.maxRateMinor) ? Number(query.maxRateMinor) : null,
      currency: BoardController.given(query.currency) ? String(query.currency) : null,
    }
  }

  /** The map's bounds from a validated query. */
  private static box(query: Record<string, unknown>): BoundingBox {
    if (Number(query.south) > Number(query.north)) throw new RequestException('The south edge must be below the north edge.', 422)

    return { west: Number(query.west), south: Number(query.south), east: Number(query.east), north: Number(query.north) }
  }

  /** Whether every value was sent. */
  private static given(...values: unknown[]): boolean {
    return values.every((value) => value !== undefined && value !== null && value !== '')
  }
}
