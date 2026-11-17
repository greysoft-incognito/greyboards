import type { Territory } from '@app/models/Territory'
import { User } from '@app/models/User'
import { Collection } from './Collection'

/** Territories, each with the name of the scout who holds it, loaded once per page. */
export class TerritoryCollection extends Collection {
  data() {
    const territories = this.items() as Territory[]
    const names = TerritoryCollection.names(territories)

    return territories.map(async (territory) => TerritoryCollection.present(territory, (await names).get(territory.scoutId ?? '') ?? null)) as never
  }

  static present(territory: Territory, scout: { name: string; email: string } | null) {
    return {
      id: territory.id,
      name: territory.name,
      latitude: territory.latitude,
      longitude: territory.longitude,
      radiusM: territory.radiusM,
      scout: territory.scoutId && scout ? { id: territory.scoutId, ...scout } : null,
      createdAt: territory.createdAt,
    }
  }

  static async names(territories: Territory[]): Promise<Map<string, { name: string; email: string }>> {
    const ids = [...new Set(territories.map((territory) => territory.scoutId).filter((id): id is string => !!id))]
    const users = ids.length ? (await User.query().whereIn('id', ids).get()).all() : []

    return new Map(users.map((user) => [user.id, { name: user.name, email: user.email }]))
  }
}
