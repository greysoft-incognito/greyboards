import { Board, type BoardKind } from '@app/models/Board'
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
      kind: `nullable|in:${Board.kinds().join(',')}`,
    })

    const query = Board.scope('listed')
    const near = BoardController.given(filters.lat, filters.lng)
    const bounds = BoardController.given(filters.west, filters.south, filters.east, filters.north)

    if (filters.kind) query.scope('ofKind', filters.kind as BoardKind)

    if (near) {
      query.scope('near', Number(filters.lat), Number(filters.lng), Number(filters.radiusKm ?? 10))
    } else if (bounds) {
      if (Number(filters.south) > Number(filters.north)) throw new RequestException('The south edge must be below the north edge.', 422)

      query.scope('within', { west: Number(filters.west), south: Number(filters.south), east: Number(filters.east), north: Number(filters.north) }).latest('createdAt')
    } else {
      query.latest('createdAt')
    }

    const boards = await query.paginate(perPage(this.query, { perPage: 50, maxPerPage: 100 }))

    return new BoardCollection(boards).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async show() {
    const board = await Board.query().findOrFail(String(this.params.board))
    const viewer = await this.viewer()

    if (!(await BoardPolicy.view(viewer, board))) throw new RequestException('Board not found.', 404)

    return new ManagedBoardResource(board).withPrivate(await BoardPolicy.seesPrivate(viewer, board)).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** Whether every value was sent. */
  private static given(...values: unknown[]): boolean {
    return values.every((value) => value !== undefined && value !== null && value !== '')
  }
}
