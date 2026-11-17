/**
 * Printing artwork and putting it up. Admins change these in the dashboard; these are the defaults.
 */
export default () => {
  return {
    /**
     * The price per square metre of board face, in naira, that a new dispatcher's rate starts
     * at. Each dispatcher sets their own; advertisers pay the price they pick.
     */
    price_per_sqm: Number(env('PRINT_PRICE_PER_SQM', 3500)),

    /**
     * Hours a dispatcher's price stays open for the advertiser to pay, after they bid or accept a request.
     */
    offer_hours: Number(env('PRINT_OFFER_HOURS', 48)),

    /**
     * Hours a dispatcher has to answer an advertiser's request.
     */
    request_hours: Number(env('PRINT_REQUEST_HOURS', 24)),

    /**
     * Requests an advertiser can have waiting on one job at once.
     */
    max_requests: Number(env('PRINT_MAX_REQUESTS', 3)),

    /**
     * Hours a dispatcher holds a job that went back at its paid price, before confirming they can deliver it.
     */
    reserve_hours: Number(env('PRINT_RESERVE_HOURS', 2)),

    /**
     * How far dispatchers look for jobs by default, in kilometres.
     */
    search_radius_km: Number(env('PRINT_SEARCH_RADIUS_KM', 25)),

    /**
     * Days before go-live the photo of the finished print is due. A dispatcher who misses
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
     * Missed jobs that suspend a dispatcher, counted over `miss_window_days`.
     */
    max_misses: Number(env('PRINT_MAX_MISSES', 3)),
    miss_window_days: Number(env('PRINT_MISS_WINDOW_DAYS', 90)),
  }
}
