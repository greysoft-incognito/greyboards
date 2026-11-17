import type { Board } from '@app/models/Board'
import type { User } from '@app/models/User'

/** Who may see, change and review a board. The one place these rules live. */
export class BoardPolicy {
  /** Listed boards are public. Others show only to their owner, their tagger and reviewers. */
  static async view(user: User | null, board: Board): Promise<boolean> {
    if (board.isListed()) return true
    if (!user) return false

    return BoardPolicy.manages(user, board) || (await BoardPolicy.review(user))
  }

  /** The owner and whoever tagged the board look after it. */
  static manages(user: User, board: Board): boolean {
    return user.id === board.ownerId || user.id === board.taggedById
  }

  /** Whether `user` sees private details: the owner's contact and review notes. */
  static async seesPrivate(user: User | null, board: Board): Promise<boolean> {
    if (!user) return false

    return BoardPolicy.manages(user, board) || (await BoardPolicy.review(user))
  }

  static review(user: User): Promise<boolean> {
    return user.can('boards.review')
  }
}
