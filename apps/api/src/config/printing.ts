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

    /**
     * Days before go-live the photo of the finished print is due. A billposter who misses
     * it, or doesn't put the ad up by go-live, loses the job.
     */
    print_by_days: Number(env('PRINT_BY_DAYS', 1)),

    /**
     * Days before go-live that count as close: a job lost this late goes back with a bonus,
     * and whoever looks after the board is warned if nobody has taken it.
     */
    rush_days: Number(env('PRINT_RUSH_DAYS', 3)),

    /**
     * Extra pay on a job that went back close to go-live, in percent of its fee. It comes out of Greyboards' part of the rent.
     */
    rush_bonus_percent: Number(env('PRINT_RUSH_BONUS_PERCENT', 25)),

    /**
     * Missed jobs that suspend a billposter, counted over `miss_window_days`.
     */
    max_misses: Number(env('PRINT_MAX_MISSES', 3)),
    miss_window_days: Number(env('PRINT_MISS_WINDOW_DAYS', 90)),
  }
}
