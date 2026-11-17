/**
 * Campaign reports. Admins change these in the dashboard; these are the defaults.
 */
export default () => {
  return {
    /**
     * Whether advertisers can make campaign reports and share them.
     */
    enabled: Boolean(env('REPORTS_ENABLED', true)),

    /**
     * The most bookings one report can hold.
     */
    max_bookings: Number(env('REPORTS_MAX_BOOKINGS', 20)),

    /**
     * Whether a shared report shows what the campaign cost. Off keeps spend private to the advertiser.
     */
    show_spend: Boolean(env('REPORTS_SHOW_SPEND', false)),
  }
}
