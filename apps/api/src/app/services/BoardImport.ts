import { abortIf } from '@arkstack/common'
import { Board, type BoardDetails, type BoardKind, type BoardRatePeriod } from '@app/models/Board'
import type { User } from '@app/models/User'
import { Csv } from '@app/support/Csv'
import { Settings } from '@app/support/Settings'

/** One spreadsheet row, checked: the board it would make, or what's wrong with it. */
export interface ImportRow {
  /** The row's line in the file, counting the heading as line 1. */
  line: number
  name: string
  ok: boolean
  errors: string[]
  /** Boards already tagged near the spot and facing a similar way. */
  duplicates: number
  /** Set once the board is made. */
  boardId?: string
  details?: BoardDetails
}

/** The columns we read, with the other headings people use for them. */
const COLUMNS: Record<string, string[]> = {
  name: ['name', 'board', 'board_name', 'title'],
  kind: ['kind', 'type', 'board_type'],
  widthM: ['width', 'width_m', 'widthm', 'width_metres', 'width_meters'],
  heightM: ['height', 'height_m', 'heightm', 'height_metres', 'height_meters'],
  latitude: ['latitude', 'lat'],
  longitude: ['longitude', 'lng', 'lon', 'long'],
  rate: ['rate', 'price', 'rate_naira', 'price_naira'],
  ratePeriod: ['period', 'rate_period', 'per'],
  faces: ['faces', 'sides'],
  lit: ['lit', 'lighting', 'lit_at_night'],
  address: ['address', 'street', 'street_address'],
  city: ['city', 'town'],
  facing: ['facing', 'faces_traffic'],
  description: ['description', 'notes', 'note'],
}

/** The heading row of the template owners download. */
export const TEMPLATE_HEADINGS = ['name', 'kind', 'width_m', 'height_m', 'latitude', 'longitude', 'rate', 'period', 'faces', 'lit', 'address', 'city', 'facing', 'description']

/**
 * Owners with many boards add them from a spreadsheet saved as CSV. Every row is checked
 * first, so they can fix the file; the rows that pass become boards waiting for review, as if
 * tagged one by one.
 */
export class BoardImport {
  /** Check every row, and make the boards that pass unless it is only a preview. */
  static async run(user: User, csv: string, options: { dryRun: boolean; ownerProfileId?: string | null }) {
    abortIf(!(await user.actsAs('owner')), 'You need an active owner role to import boards.', 403)

    const rows = Csv.parse(csv)
    const most = await Settings.number('imports.max_rows')

    abortIf(rows.length < 2, 'The file needs a heading row and at least one board.', 422)
    abortIf(rows.length - 1 > most, `Import up to ${most} boards at a time. Split the file and import each part.`, 422)

    const columns = BoardImport.columns(rows[0]!)
    const missing = ['name', 'kind', 'widthM', 'heightM', 'latitude', 'longitude'].filter((column) => columns[column] === undefined)

    abortIf(missing.length > 0, `The heading row needs ${missing.map((column) => COLUMNS[column]![0]).join(', ')}. Download the template to see them all.`, 422)

    const checked: ImportRow[] = []

    for (const [index, cells] of rows.slice(1).entries()) {
      const row = BoardImport.check(cells, columns, index + 2)

      if (row.details) row.duplicates = (await Board.possibleDuplicates(row.details.latitude, row.details.longitude, null)).length
      checked.push(row)
    }

    if (!options.dryRun) {
      for (const row of checked.filter((candidate) => candidate.ok)) {
        const board = await Board.tag(user, row.details!, { ownerProfileId: options.ownerProfileId ?? null }, true)

        row.boardId = board.id
      }
    }

    const ok = checked.filter((row) => row.ok).length

    return {
      dryRun: options.dryRun,
      total: checked.length,
      ok,
      failed: checked.length - ok,
      imported: options.dryRun ? 0 : ok,
      rows: checked.map(({ details: _details, ...row }) => row),
    }
  }

  /** Where each column we read sits in the heading row. */
  private static columns(headings: string[]): Record<string, number | undefined> {
    const normal = headings.map((heading) =>
      heading
        .trim()
        .toLowerCase()
        .replace(/\(.*?\)/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, ''),
    )
    const found: Record<string, number | undefined> = {}

    for (const [column, names] of Object.entries(COLUMNS)) {
      const index = normal.findIndex((heading) => names.includes(heading))

      found[column] = index === -1 ? undefined : index
    }

    return found
  }

  /** One row's board, or what's wrong with it. */
  private static check(cells: string[], columns: Record<string, number | undefined>, line: number): ImportRow {
    const cell = (column: string) => (columns[column] === undefined ? '' : (cells[columns[column]!] ?? '').trim())
    const errors: string[] = []
    const number = (column: string, label: string, min: number, max: number, required = true): number | null => {
      const raw = cell(column).replace(/[₦,\s]/g, '')

      if (raw === '') {
        if (required) errors.push(`${label} is missing.`)

        return null
      }

      const value = Number(raw)

      if (!Number.isFinite(value) || value < min || value > max) {
        errors.push(`${label} must be a number from ${min} to ${max}.`)

        return null
      }

      return value
    }
    const text = (column: string, label: string, max: number): string | null => {
      const value = cell(column)

      if (value.length > max) errors.push(`${label} must be ${max} characters or fewer.`)

      return value || null
    }

    const name = cell('name')

    if (name.length < 2 || name.length > 120) errors.push('Name must be 2 to 120 characters.')

    const kindCell = cell('kind').toLowerCase()
    const kind = Board.KINDS.find((definition) => definition.kind === kindCell.replace(/[\s-]+/g, '_') || definition.label.toLowerCase() === kindCell)?.kind as BoardKind | undefined

    if (!kind) errors.push(`Kind must be one of: ${Board.KINDS.map((definition) => definition.kind).join(', ')}.`)

    const periodCell = cell('ratePeriod').toLowerCase().replace(/ly$/, '')
    const ratePeriod = (periodCell === '' ? 'month' : periodCell) as BoardRatePeriod

    if (!Board.PERIODS.includes(ratePeriod)) errors.push('Period must be week or month.')

    const litCell = cell('lit').toLowerCase()
    const rate = number('rate', 'Rate', 0, 1_000_000_000, false)
    const details: BoardDetails = {
      name,
      kind: kind ?? 'billboard',
      widthM: number('widthM', 'Width', 0.5, 100) ?? 0,
      heightM: number('heightM', 'Height', 0.5, 100) ?? 0,
      latitude: number('latitude', 'Latitude', -90, 90) ?? 0,
      longitude: number('longitude', 'Longitude', -180, 180) ?? 0,
      faces: number('faces', 'Faces', 1, 4, false) ?? 1,
      lit: ['yes', 'y', 'true', '1', 'lit'].includes(litCell),
      rateMinor: rate === null ? null : Math.round(rate * 100),
      ratePeriod,
      address: text('address', 'Address', 191),
      city: text('city', 'City', 80),
      facing: text('facing', 'Facing', 60),
      description: text('description', 'Description', 1000),
      country: 'NG',
    } as BoardDetails

    if (details.faces !== null && details.faces !== undefined && !Number.isInteger(details.faces)) errors.push('Faces must be a whole number.')

    return { line, name, ok: errors.length === 0, errors, duplicates: 0, details: errors.length ? undefined : details }
  }
}
