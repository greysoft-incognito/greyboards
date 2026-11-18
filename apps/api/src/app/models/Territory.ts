import { Model } from '@arkstack/database'

/** An area staff give a scout, as a circle on the map. Without a scout it's open to anyone. */
export class Territory extends Model {
  declare id: string
  declare name: string
  declare scoutId: string | null
  declare latitude: number
  declare longitude: number
  declare radiusM: number
  declare createdAt: Date
  declare updatedAt: Date

  protected static override table = 'territories'

  protected static override columns = {
    scoutId: 'scout_id',
    radiusM: 'radius_m',
  }

  protected override casts = {
    latitude: 'number',
    longitude: 'number',
    radiusM: 'number',
  } as never

  /** SQL for "within `metres` of the point (lng, lat)", for a table with latitude and longitude columns. */
  static readonly WITHIN_SQL = 'ST_DWithin(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)'
}
