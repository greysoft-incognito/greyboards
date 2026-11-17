/**
 * Proof that an ad is up, which releases the booking's money. Admins change these in the
 * dashboard; these are the defaults.
 */
export default () => {
  return {
    /**
     * Geotagged photos of the posted ad needed before it can be sent to the advertiser.
     */
    min_photos: Number(env('PROOF_MIN_PHOTOS', 2)),

    /**
     * How far from the board, in metres, a proof photo may be taken.
     */
    max_distance_m: Number(env('PROOF_MAX_DISTANCE_M', 150)),

    /**
     * Hours the advertiser has to check the proof before it is accepted for them and the
     * money is paid out.
     */
    accept_hours: Number(env('PROOF_ACCEPT_HOURS', 48)),
  }
}
