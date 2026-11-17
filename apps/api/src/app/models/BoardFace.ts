import { Model } from '@arkstack/database'

/** What an owner or scout can change on a face's rate card. */
export interface BoardFaceInput {
  label?: string
  headingDeg?: number | null
  rateMinor?: number | null
  minPeriods?: number
}

/**
 * One side of a board that takes its own ad. Each face is booked on its own, at its own
 * rate (the board's rate when it has none) and for at least `minPeriods` weeks or months.
 */
export class BoardFace extends Model {
  declare id: string
  declare boardId: string
  declare position: number
  declare label: string
  declare headingDeg: number | null
  declare rateMinor: string | number | null
  declare minPeriods: number
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'board_faces'

  protected static override columns = {
    boardId: 'board_id',
    headingDeg: 'heading_deg',
    rateMinor: 'rate_minor',
    minPeriods: 'min_periods',
  }

  /** The default name of the face at `position`: Face A, Face B and on. */
  static labelFor(position: number): string {
    return `Face ${String.fromCharCode(64 + position)}`
  }

  /** Save changes to the rate card. Empty labels fall back to the default name. */
  async revise(input: BoardFaceInput): Promise<void> {
    const changes: Record<string, unknown> = { ...input }

    if (input.label !== undefined) changes.label = input.label.trim() || BoardFace.labelFor(this.position)

    await this.update(changes)
  }

  /** The face's own rate in minor units, or null when it uses the board's. */
  ownRate(): number | null {
    return this.rateMinor === null || this.rateMinor === undefined ? null : Number(this.rateMinor)
  }
}
