import { Day } from '@app/support/Day'
import { randomBytes, randomUUID } from 'node:crypto'
import { MockImages } from './MockImages'

/** A model class whose query builder can bulk insert rows. */
interface Insertable {
  query(): { insert(values: Record<string, unknown>[]): Promise<unknown> }
}

/** A seeded row the later seeders refer back to. */
export interface MockRecord {
  id: string
  [field: string]: unknown
}

/**
 * What the mock seeders share while they run: the rows made so far by their content key, a
 * clock relative to today so the data always looks current, and bounded batch inserts.
 */
export class MockData {
  /** Rows sent to the database in one insert. */
  static readonly BATCH = 100

  /** The password every demo account signs in with. */
  static readonly PASSWORD = 'greyboards-demo'

  /** The email the mock admin uses, which also marks a database as already seeded. */
  static readonly ADMIN_EMAIL = 'admin@example.com'

  readonly images = new MockImages()

  private readonly records = new Map<string, Map<string, MockRecord>>()

  private readonly startedAt = Date.now()

  /** Remember `record` under `group` and `key`, and return it. */
  keep<T extends MockRecord>(group: string, key: string, record: T): T {
    if (!this.records.has(group)) this.records.set(group, new Map())

    this.records.get(group)!.set(key, record)

    return record
  }

  get<T extends MockRecord = MockRecord>(group: string, key: string): T {
    const record = this.records.get(group)?.get(key)

    if (!record) throw new Error(`Mock ${group} "${key}" hasn't been seeded.`)

    return record as T
  }

  find<T extends MockRecord = MockRecord>(group: string, key: string | null | undefined): T | null {
    return key ? ((this.records.get(group)?.get(key) as T | undefined) ?? null) : null
  }

  all<T extends MockRecord = MockRecord>(group: string): T[] {
    return [...(this.records.get(group)?.values() ?? [])] as T[]
  }

  /** Insert `rows` into `model`'s table, at most `BATCH` at a time. */
  async insert(model: Insertable, rows: Record<string, unknown>[]): Promise<void> {
    for (let start = 0; start < rows.length; start += MockData.BATCH) {
      await model.query().insert(rows.slice(start, start + MockData.BATCH))
    }
  }

  id(): string {
    return randomUUID()
  }

  token(bytes = 16): string {
    return randomBytes(bytes).toString('hex')
  }

  /** The day `days` from today, as YYYY-MM-DD. */
  day(days = 0): string {
    return Day.today(days)
  }

  /** The moment `days` from now, give or take `hours`. */
  at(days: number, hours = 0): Date {
    return new Date(this.startedAt + days * 86_400_000 + hours * 3_600_000)
  }

  /** Noon on `day`, for things that happened on a given date. */
  on(day: string, hours = 12): Date {
    return new Date(`${day}T${String(hours).padStart(2, '0')}:00:00Z`)
  }

  /** Created and updated timestamps for a row made `days` from now. */
  stamps(days: number, hours = 0): { createdAt: Date; updatedAt: Date } {
    const at = this.at(days, hours)

    return { createdAt: at, updatedAt: at }
  }
}
