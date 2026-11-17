import { DB, Migration } from 'arkormx'

/** Map queries (boards in a radius, in a drawn area, along a route) run on PostGIS. */
export default class EnablePostgisMigration extends Migration {
  public async up(): Promise<void> {}

  public async down(): Promise<void> {}

  public async done(direction: 'up' | 'down'): Promise<void> {
    await DB.raw(direction === 'up' ? 'create extension if not exists postgis' : 'drop extension if exists postgis')
  }
}
