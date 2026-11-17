import { Board, type BoardStatus } from '@app/models/Board'
import { AdminBoardCollection } from '@app/http/resources/AdminBoardCollection'
import { AdminBoardResource } from '@app/http/resources/AdminBoardResource'
import { BaseController } from '../BaseController'
import { perPage } from '@arkstack/common'

/** Reviewers check boards before advertisers can find them. */
export default class BoardController extends BaseController {
  /** Boards to check, oldest first so none wait too long. */
  async index() {
    const filters = await this.validateQuery({ status: `nullable|in:${Board.STATUSES.join(',')}` })
    const boards = await Board.scope('withStatus', (filters.status ?? Board.PENDING) as BoardStatus)
      .oldest('createdAt')
      .paginate(perPage(this.query, { perPage: 25, maxPerPage: 100 }))

    return new AdminBoardCollection(boards).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async show() {
    const board = await Board.query().findOrFail(String(this.params.board))

    return new AdminBoardResource(board).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async update() {
    const board = await Board.query().findOrFail(String(this.params.board))
    const data = await this.validate({
      status: 'required|in:listed,rejected,unlisted',
      note: 'nullable|string|max:191',
    })

    await board.review(this.user, data.status as BoardStatus, data.note)

    return new AdminBoardResource(board).additional({ status: 'success', message: 'Review saved', code: 200 })
  }
}
