/**
 * Booking boards and sharing the money. Admins change these in the dashboard; these are the defaults.
 */
export default () => {
  return {
    /**
     * Greyboards' commission from the owner on boards owners run themselves, in percent.
     * On boards a scout runs, the owner's signed share decides it instead.
     */
    commission_percent: Number(env('BOOKING_COMMISSION_PERCENT', 15)),

    /**
     * The scout's part of Greyboards' commission on boards they brought in, in percent.
     */
    scout_share_percent: Number(env('BOOKING_SCOUT_SHARE_PERCENT', 30)),

    /**
     * Minutes the dates stay held for someone at checkout.
     */
    hold_minutes: Number(env('BOOKING_HOLD_MINUTES', 15)),

    /**
     * Days between booking and the first day on the board, to print and put the artwork up.
     */
    lead_days: Number(env('BOOKING_LEAD_DAYS', 3)),

    /**
     * The most weeks or months one booking can cover.
     */
    max_periods: Number(env('BOOKING_MAX_PERIODS', 12)),
  }
}
