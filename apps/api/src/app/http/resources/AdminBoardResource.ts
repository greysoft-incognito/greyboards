import type { Board } from '@app/models/Board'
import { AdminUserResource } from './AdminUserResource'
import { ManagedBoardResource } from './ManagedBoardResource'

/** A board as reviewers see it, with the account that tagged it. */
export class AdminBoardResource extends ManagedBoardResource {
  async data() {
    const board = this.resource as Board
    const tagger = await board.tagger().first()

    return {
      ...(await super.data()),
      tagger: tagger ? await new AdminUserResource(tagger).data() : null,
    }
  }
}
