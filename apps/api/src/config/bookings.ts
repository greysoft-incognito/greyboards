/**
 * Booking boards. How the money is shared is in config/revenue.ts. Admins change these in the dashboard; these are the defaults.
 */
export default () => {
  return {
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

    /**
     * Days before the start that an advertiser can cancel a paid booking for all their money back.
     */
    full_refund_days: Number(env('BOOKING_FULL_REFUND_DAYS', 7)),

    /**
     * Percent of the rent refunded when they cancel later, before the start. The rest goes to the owner and Greyboards.
     */
    late_refund_percent: Number(env('BOOKING_LATE_REFUND_PERCENT', 50)),
  }
}
