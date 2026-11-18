import { abortIf } from '@arkstack/common'
import { Board } from '@app/models/Board'
import type { BoardFace } from '@app/models/BoardFace'
import type { User } from '@app/models/User'
import { BoardPolicy } from '@app/policies/BoardPolicy'
import { Settings } from '@app/support/Settings'
import { OwnerPricing } from './OwnerPricing'

/** How a price rule changes each rate: by a percent, by an amount, or to an amount. */
export type PriceChange = 'percent' | 'amount' | 'set'

export interface PriceRuleInput {
  boardIds: string[]
  change: PriceChange
  /** A percent for `percent` (−90 to 500); kobo for `amount` (may be negative) and `set`. */
  value: number
  /** Round each new rate to this many kobo. ₦1,000 by default. */
  roundToMinor?: number
  /** Also change the faces that have their own rate. On by default. */
  faces?: boolean
  dryRun: boolean
}

/**
 * Change the rates of several boards at once: up or down by a percent or an amount, or to
 * one amount. On a board whose owner gets a fixed amount, the rule changes that amount and the
 * listed rate follows. A preview shows each rate before and after, without saving.
 */
export class PriceRules {
  static async apply(user: User, input: PriceRuleInput) {
    const most = await Settings.number('imports.max_rows')
    const ids = [...new Set(input.boardIds)]

    abortIf(!ids.length, 'Pick at least one board.', 422)
    abortIf(ids.length > most, `Change up to ${most} boards at a time.`, 422)
    abortIf(input.change === 'percent' && (input.value < -90 || input.value > 500), 'Change by between −90% and 500%.', 422)
    abortIf(input.change === 'set' && input.value <= 0, 'Set a rate above zero.', 422)

    const boards = (await Board.query().whereIn('id', ids).get()).all().sort((first, second) => ids.indexOf(first.id) - ids.indexOf(second.id))
    const rows = []

    for (const board of boards) {
      if (!(await BoardPolicy.manages(user, board))) continue

      rows.push(await PriceRules.applyTo(board, input))
    }

    abortIf(!rows.length, 'None of those boards are yours to price.', 404)

    return { dryRun: input.dryRun, changed: rows.filter((row) => !row.skipped).length, rows }
  }

  private static async applyTo(board: Board, input: PriceRuleInput) {
    const net = !!board.ownerNet
    const before = net ? (board.ownerRate() ?? board.rate()) : board.rate()

    if (before === null && input.change !== 'set') return { boardId: board.id, name: board.name, ownerNet: net, beforeMinor: null, afterMinor: null, faces: [], skipped: 'No rate yet.' }

    const after = PriceRules.next(before ?? 0, input)
    const faces = input.faces === false ? [] : (await board.boardFaces().getResults()).all().filter((face) => PriceRules.faceRate(face, net) !== null)
    const faceRows = faces.map((face) => ({ id: face.id, label: face.label, beforeMinor: PriceRules.faceRate(face, net)!, afterMinor: PriceRules.next(PriceRules.faceRate(face, net)!, input) }))

    if (!input.dryRun) {
      for (const row of faceRows) {
        const face = faces.find((candidate) => candidate.id === row.id)!

        await face.update(net ? { ownerRateMinor: row.afterMinor } : { rateMinor: row.afterMinor })
      }

      if (net) await OwnerPricing.apply(board, after)
      else await board.update({ rateMinor: after })
    }

    return { boardId: board.id, name: board.name, ownerNet: net, beforeMinor: before, afterMinor: after, faces: faceRows, skipped: null }
  }

  /** The rate a face has of its own: the owner's amount on a board that fixes it. */
  private static faceRate(face: BoardFace, net: boolean): number | null {
    return net ? (face.ownerRate() ?? face.ownRate()) : face.ownRate()
  }

  private static next(rate: number, input: PriceRuleInput): number {
    const round = Math.max(1, input.roundToMinor ?? 100_000)
    const raw = input.change === 'percent' ? rate * (1 + input.value / 100) : input.change === 'amount' ? rate + input.value : input.value

    return Math.max(0, Math.round(raw / round) * round)
  }
}
