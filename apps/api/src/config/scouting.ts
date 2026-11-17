/**
 * The scout pipeline, territories and task list. Admins change these in the dashboard; these are the defaults.
 */
export default () => {
  return {
    /**
     * How close, in metres, another scout's prospect has to be to count as the same board.
     */
    claim_radius_m: Number(env('SCOUTING_CLAIM_RADIUS_M', 50)),

    /**
     * Days a prospect nobody touches keeps other scouts away from its board and owner.
     */
    claim_days: Number(env('SCOUTING_CLAIM_DAYS', 30)),

    /**
     * Whether scouts can only add prospects in their own territories or areas nobody holds.
     */
    enforce_territories: Boolean(env('SCOUTING_ENFORCE_TERRITORIES', false)),

    /**
     * Days ahead the task list looks for proofs and installs due, and days a prospect waits before it needs a follow-up.
     */
    task_days: Number(env('SCOUTING_TASK_DAYS', 7)),
  }
}
