/**
 * Bidding for a board's dates, and offers below the listed price. Admins change these in
 * the dashboard; these are the defaults.
 */
export default () => {
  return {
    /**
     * `open` shows everyone the highest bid as it climbs; `sealed` hides bids until bidding closes.
     * Auctions keep the format they were opened with.
     */
    format: String(env('BIDS_FORMAT', 'open')),

    /**
     * The lowest reserve an owner or scout may set, as a percent of the face's listed price for the dates.
     */
    min_reserve_percent: Number(env('BIDS_MIN_RESERVE_PERCENT', 100)),

    /**
     * How much a new bid must beat the highest by, in percent, on open auctions.
     */
    min_raise_percent: Number(env('BIDS_MIN_RAISE_PERCENT', 5)),

    /**
     * A bid this close to closing pushes the close back to this long after the bid, so nobody wins by sniping.
     */
    extend_minutes: Number(env('BIDS_EXTEND_MINUTES', 5)),

    /**
     * The longest an auction can stay open, in days.
     */
    max_open_days: Number(env('BIDS_MAX_OPEN_DAYS', 30)),

    /**
     * Hours the winning bidder, or an advertiser whose offer was accepted, has to pay. A winner who doesn't pay loses it to the next bid.
     */
    pay_hours: Number(env('BIDS_PAY_HOURS', 24)),

    /**
     * The lowest offer an advertiser may make, as a percent of the listed price.
     */
    min_offer_percent: Number(env('OFFERS_MIN_PERCENT', 50)),

    /**
     * Hours the other side has to answer an offer or a counter before it lapses.
     */
    offer_reply_hours: Number(env('OFFERS_REPLY_HOURS', 48)),
  }
}
