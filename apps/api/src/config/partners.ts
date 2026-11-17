/**
 * Checks on scouts and dispatchers before they are let in, and on boards as they are tagged.
 * Admins change these in the dashboard; these are the defaults.
 */
export default () => {
  return {
    /**
     * Whether scouts and dispatchers must send a photo of their ID before approval.
     */
    require_id: Boolean(env('PARTNERS_REQUIRE_ID', true)),

    /**
     * Whether they must add a bank account the bank confirmed before approval.
     */
    require_bank: Boolean(env('PARTNERS_REQUIRE_BANK', true)),

    /**
     * Metres within which a newly tagged board facing a similar way counts as a possible duplicate.
     */
    duplicate_radius_m: Number(env('BOARD_DUPLICATE_RADIUS_M', 30)),
  }
}
