import type { Board } from '@app/models/Board'
import { OwnerProfile } from '@app/models/OwnerProfile'
import type { User } from '@app/models/User'

/** Who may see, change and review a board. The one place these rules live. */
export class BoardPolicy {
  /** Listed boards are public. Others show only to whoever looks after them and to reviewers. */
  static async view(user: User | null, board: Board): Promise<boolean> {
    if (board.isListed()) return true
    if (!user) return false

    return (await BoardPolicy.manages(user, board)) || (await BoardPolicy.review(user))
  }

  /** The scout who tagged the board and the account managing its owner profile look after it. */
  static async manages(user: User, board: Board): Promise<boolean> {
    if (user.id === board.taggedById) return true
    if (!board.ownerProfileId) return false

    return OwnerProfile.query().where({ id: board.ownerProfileId, userId: user.id }).exists()
  }

  /** Whether `user` sees private details: the owner's contact, the agreement and review notes. */
  static async seesPrivate(user: User | null, board: Board): Promise<boolean> {
    if (!user) return false

    return (await BoardPolicy.manages(user, board)) || (await BoardPolicy.review(user))
  }

  static review(user: User): Promise<boolean> {
    return user.can('boards.review')
  }
}
