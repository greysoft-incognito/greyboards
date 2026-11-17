import { Board } from '@app/models/Board'
import { AdminUserResource } from './AdminUserResource'
import { ManagedBoardResource } from './ManagedBoardResource'

/** A board as reviewers see it, with the account that tagged it. */
export class AdminBoardResource extends ManagedBoardResource {
  async data() {
    const board = this.resource as Board
    const tagger = await board.tagger().first()
    const duplicate = board.duplicateOfId ? await Board.query().find(board.duplicateOfId) : null

    return {
      ...(await super.data()),
      tagger: tagger ? await new AdminUserResource(tagger).data() : null,
      duplicateOf: duplicate ? { id: duplicate.id, name: duplicate.name, status: duplicate.status, taggedById: duplicate.taggedById } : null,
    }
  }
}
