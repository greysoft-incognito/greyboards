/**
 * Reviews after a campaign. Admins change these in the dashboard; these are the defaults.
 */
export default () => {
  return {
    /**
     * Whether advertisers and the board's side can rate each other.
     */
    enabled: Boolean(env('REVIEWS_ENABLED', true)),

    /**
     * Days after a booking's last day that its reviews can be written or changed.
     */
    window_days: Number(env('REVIEWS_WINDOW_DAYS', 30)),

    /**
     * Reviews a board or advertiser needs before their average shows, so one rating doesn't decide it.
     */
    min_to_show: Number(env('REVIEWS_MIN_TO_SHOW', 3)),
  }
}
