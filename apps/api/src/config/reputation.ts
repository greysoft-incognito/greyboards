/**
 * Reputation and the proven badge. Admins change these in the dashboard; these are the defaults.
 */
export default () => {
  return {
    /**
     * Whether checked actions add to reputation and the proven badge is given.
     */
    enabled: Boolean(env('REPUTATION_ENABLED', true)),

    /**
     * Points for putting up an ad whose proof the advertiser accepted.
     */
    points_posted: Number(env('REPUTATION_POINTS_POSTED', 10)),

    /**
     * Points for a scout whose owner signed the agreement they sent.
     */
    points_signed: Number(env('REPUTATION_POINTS_SIGNED', 8)),

    /**
     * Points for the owner and scout of a board whose campaign went up and was checked.
     */
    points_hosted: Number(env('REPUTATION_POINTS_HOSTED', 4)),

    /**
     * Points for an advertiser whose paid campaign went up and was checked.
     */
    points_campaign: Number(env('REPUTATION_POINTS_CAMPAIGN', 3)),

    /**
     * Points taken from a dispatcher who loses a print job by missing its date.
     */
    points_missed: Number(env('REPUTATION_POINTS_MISSED', 15)),

    /**
     * The score a role needs for the proven badge.
     */
    proven_score: Number(env('REPUTATION_PROVEN_SCORE', 100)),

    /**
     * Checked actions a role needs for the proven badge.
     */
    proven_actions: Number(env('REPUTATION_PROVEN_ACTIONS', 10)),

    /**
     * Days a role must be held before it can be proven.
     */
    proven_days: Number(env('REPUTATION_PROVEN_DAYS', 30)),

    /**
     * Whether the proven badge goes when the score falls below `proven_score`.
     */
    revoke_proven: Boolean(env('REPUTATION_REVOKE_PROVEN', true)),
  }
}
