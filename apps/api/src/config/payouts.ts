/**
 * Paying owners, scouts and dispatchers into their bank accounts. Admins change these in the
 * dashboard; these are the defaults.
 */
export default () => {
  return {
    /**
     * Whether money owed is sent to bank accounts automatically. Off until live payment keys are in.
     */
    enabled: Boolean(env('PAYOUTS_ENABLED', false)),

    /**
     * Days after a booking's money is released before it is paid out, so a refund in that time can still be stopped.
     */
    hold_days: Number(env('PAYOUT_HOLD_DAYS', 2)),

    /**
     * The country whose banks people pick from.
     */
    country: String(env('PAYOUT_COUNTRY', 'NG')),
  }
}
