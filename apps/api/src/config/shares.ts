/**
 * Shared (co-op) bookings, where several advertisers pay for one board over the same days and
 * the print merges each advertiser's design. Admins change
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

    /**
     * Whether shared bookings with shares left show to everyone, so anyone can find one and join.
     */
    discoverable: Boolean(env('SHARED_BOOKINGS_DISCOVERABLE', true)),

    /**
     * Hours after a shared booking starts that it stays locked for the people sharing it. After
     * that, while shares are still unpaid, anyone can pay for the whole board and take it; those
     * who paid a share get their money back.
     */
    lock_hours: Number(env('SHARED_BOOKINGS_LOCK_HOURS', 24)),

    /**
     * Whether someone can take a shared board whole once its lock ends.
     */
    takeover: Boolean(env('SHARED_BOOKINGS_TAKEOVER', true)),

    /**
     * How the advertisers' designs are merged into one print: `columns` side by side, `rows` one above another.
     */
    merge_layout: String(env('SHARED_BOOKINGS_MERGE_LAYOUT', 'columns')),
  }
}
