/**
 * Shared (co-op) bookings, where several advertisers split one booking's cost. Admins change
 * these in the dashboard; these are the defaults.
 */
export default () => {
  return {
    /**
     * Whether advertisers can split a booking with others.
     */
    enabled: Boolean(env('SHARED_BOOKINGS_ENABLED', true)),

    /**
     * The most advertisers one booking can be split between, the organiser included.
     */
    max_shares: Number(env('SHARED_BOOKINGS_MAX_SHARES', 6)),

    /**
     * Hours everyone has to pay their share. The dates stay held until then; if a share is still unpaid, the
     * organiser can cover it, or the booking lapses and everyone who paid gets their money back.
     */
    pay_hours: Number(env('SHARED_BOOKINGS_PAY_HOURS', 48)),
  }
}
