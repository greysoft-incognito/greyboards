import type { Board } from '@app/models/Board'
import { BoardFace } from '@app/models/BoardFace'
import { Commissions } from './Commissions'

/**
 * Boards whose tagger fixed what the owner receives. The rate they enter is the owner's amount
 * for each period; the listed rate is grossed up from it by the owner's percent, so the other
 * shares are added on top instead of coming out of the owner's. The split also never pays the
 * owner less than the fixed amount, in case the percent or the price changes later.
 */
export class OwnerPricing {
  /**
   * Bring the listed rates in line after the board was tagged or edited. With the fixed amount
   * on, the rate sent (or the one kept) is the owner's, and each face with its own rate is grossed
   * up too. Turning it off keeps the listed rates as they are.
   */
  static async apply(board: Board, sentRateMinor?: number | null): Promise<void> {
    const faces = (await board.boardFaces().getResults()).all()

    if (!board.ownerNet) {
      if (board.ownerRate() === null && faces.every((face) => face.ownerRate() === null)) return

      await board.update({ ownerRateMinor: null })
      await BoardFace.query().where({ boardId: board.id }).updateFrom({ ownerRateMinor: null })

      return
    }

    const percent = await Commissions.ownerPercent(board)
    const net = sentRateMinor !== undefined ? sentRateMinor : (board.ownerRate() ?? board.rate())

    await board.update({ ownerRateMinor: net, rateMinor: net === null ? null : Commissions.grossUp(net, percent) })

    for (const face of faces) {
      const faceNet = face.ownerRate() ?? face.ownRate()

      if (faceNet !== null) await face.update({ ownerRateMinor: faceNet, rateMinor: Commissions.grossUp(faceNet, percent) })
    }
  }

  /** A face's own rate was changed. On a board with the fixed amount on, it's the owner's amount. */
  static async applyFace(board: Board, face: BoardFace, sentRateMinor: number | null): Promise<void> {
    if (!board.ownerNet) return

    await face.update({
      ownerRateMinor: sentRateMinor,
      rateMinor: sentRateMinor === null ? null : Commissions.grossUp(sentRateMinor, await Commissions.ownerPercent(board)),
    })
  }

  /** What the owner must receive for `periods` on a face, or 0 when the board doesn't fix it. */
  static async fixedFor(board: Board, faceId: string | null, periods: number): Promise<number> {
    if (!board.ownerNet) return 0

    const face = faceId ? await BoardFace.query().find(faceId) : null
    const perPeriod = face && face.ownRate() !== null ? face.ownerRate() : board.ownerRate()

    return (perPeriod ?? 0) * periods
  }

  /** The owner's percent and the rate to list for an owner's amount, for the tagging form's preview. */
  static async quote(scouted: boolean, ownerMinor: number | null) {
    const percent = Commissions.ownerPercentFor(scouted, await Commissions.revenue())

    return { ownerPercent: percent, listedMinor: ownerMinor === null ? null : Commissions.grossUp(ownerMinor, percent) }
  }
}
