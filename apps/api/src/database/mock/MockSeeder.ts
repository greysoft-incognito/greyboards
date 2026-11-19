import { Seeder } from '@arkstack/database'
import type { MockData } from './MockData'

/** One part of the mock data. Parts run in order and share what they made through `data`. */
export abstract class MockSeeder extends Seeder {
  constructor(protected readonly data: MockData) {
    super()
  }

  abstract override run(): Promise<void>
}
