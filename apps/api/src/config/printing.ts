/**
 * Printing artwork and putting it up. Admins change these in the dashboard; these are the defaults.
 */
export default () => {
  return {
    /**
     * What printing and posting costs per square metre of board face, in naira. Added to
     * bookings of printed boards and paid to the billposter once the ad is up.
     */
    price_per_sqm: Number(env('PRINT_PRICE_PER_SQM', 3500)),

    /**
     * Hours a billposter holds a job before confirming they can deliver it.
     */
    reserve_hours: Number(env('PRINT_RESERVE_HOURS', 2)),

    /**
     * How far billposters look for jobs by default, in kilometres.
     */
    search_radius_km: Number(env('PRINT_SEARCH_RADIUS_KM', 25)),
  }
}
