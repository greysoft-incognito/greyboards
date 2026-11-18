/**
 * Traffic estimates and price guidance. Admins change these in the dashboard; these are the
 * defaults. A board's estimate comes from a count someone measured, or else from the kind of
 * road it faces.
 */
export default () => {
  return {
    /**
     * People passing each day, by the kind of road a board faces.
     */
    expressway_daily: Number(env('TRAFFIC_EXPRESSWAY_DAILY', 60000)),
    major_daily: Number(env('TRAFFIC_MAJOR_DAILY', 30000)),
    street_daily: Number(env('TRAFFIC_STREET_DAILY', 12000)),
    local_daily: Number(env('TRAFFIC_LOCAL_DAILY', 4000)),

    /**
     * What 1,000 views are worth, in kobo, for price guidance from traffic.
     */
    cpm_minor: Number(env('TRAFFIC_CPM_MINOR', 40000)),

    /**
     * How far to look for listed boards of the same kind to compare prices with, and how many
     * are needed before their prices guide a new one.
     */
    comparables_radius_km: Number(env('PRICE_GUIDE_RADIUS_KM', 5)),
    comparables_min: Number(env('PRICE_GUIDE_MIN_BOARDS', 3)),
  }
}
