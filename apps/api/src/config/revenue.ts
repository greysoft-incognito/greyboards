/**
 * How a booking's rent is shared once printing and posting is paid for. The three percents
 * always add up to 100. Admins change them in the dashboard; these are the defaults.
 */
export default () => {
  return {
    /** The board owner's part, in percent. Agreements are signed at the value in use then. */
    owner_percent: Number(env('REVENUE_OWNER_PERCENT', 70)),

    /** Greyboards' part, in percent. Rush bonuses for print jobs come out of it. */
    platform_percent: Number(env('REVENUE_PLATFORM_PERCENT', 20)),

    /** The part of the scout who brought the board in, in percent. */
    scout_percent: Number(env('REVENUE_SCOUT_PERCENT', 10)),

    /**
     * Who gets the scout's part on boards their owner tagged, with no scout: 'owner' or 'platform'.
     */
    unscouted_to: String(env('REVENUE_UNSCOUTED_TO', 'owner')),
  }
}
