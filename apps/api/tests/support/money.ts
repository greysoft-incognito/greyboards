import { vi } from 'vitest'

import { Settings } from '@app/support/Settings'

/** A stand-in query builder: every chained call returns itself and the finishers resolve to `rows`. */
export const fakeQuery = <T>(rows: T[] = [], created: unknown[] = []) => {
  const query: Record<string, unknown> = new Proxy(
    {},
    {
      get: (_, name: string) => {
        if (name === 'then') return undefined
        if (name === 'first') return async () => rows[0] ?? null
        if (name === 'exists') return async () => rows.length > 0
        if (name === 'get') return async () => ({ all: () => rows })
        if (name === 'updateFrom') return async () => rows.length
        if (name === 'create') return async (attributes: unknown) => created.push(attributes)

        return () => query
      },
    },
  )

  return query as never
}

/** Settings in use for this test file only, so other files keep the saved values. */
export const useSettings = (values: Record<string, unknown>) => {
  const get = Settings.get.bind(Settings)

  return vi.spyOn(Settings, 'get').mockImplementation(async (key: string) => (key in values ? values[key] : get(key)) as never)
}

/** The 70 / 20 / 10 split with the scout's part going to the owner on boards with no scout. */
export const DEFAULT_SPLIT = {
  'revenue.owner_percent': 70,
  'revenue.platform_percent': 20,
  'revenue.scout_percent': 10,
  'revenue.unscouted_to': 'owner',
}
