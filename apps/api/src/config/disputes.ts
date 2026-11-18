/**
 * Disputes about a booking. Admins change these in the dashboard; these are the defaults.
 */
export default () => {
  return {
    /**
     * Whether the advertiser, the board's side and the dispatcher can raise a dispute.
     */
    enabled: Boolean(env('DISPUTES_ENABLED', true)),

    /**
     * Days after a booking's last day that a dispute can still be raised.
     */
    window_days: Number(env('DISPUTES_WINDOW_DAYS', 14)),

    /**
     * Hours staff aim to decide a dispute in, shown to whoever raised it.
     */
    answer_hours: Number(env('DISPUTES_ANSWER_HOURS', 48)),

    /**
     * Whether an open dispute stops an unchecked proof from counting as accepted, so the money stays in escrow.
     */
    pause_auto_accept: Boolean(env('DISPUTES_PAUSE_AUTO_ACCEPT', true)),
  }
}
