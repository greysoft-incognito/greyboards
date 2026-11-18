/**
 * Digital screens, which sell slots in a loop by part of the day. Admins change these in the
 * dashboard; these are the defaults. Owners can set their own loop on each screen.
 */
export default () => {
  return {
    /**
     * Slots in a screen's loop, when its owner hasn't set them. Each booking takes one or more.
     */
    loop_slots: Number(env('DIGITAL_LOOP_SLOTS', 6)),

    /**
     * Seconds each slot plays for, when the owner hasn't set it.
     */
    slot_seconds: Number(env('DIGITAL_SLOT_SECONDS', 10)),

    /**
     * What a slot costs for part of the day, as a percent of the screen's all-day rate per slot.
     * Morning is 6 AM to noon, afternoon noon to 6 PM, and evening 6 PM to midnight.
     */
    morning_percent: Number(env('DIGITAL_MORNING_PERCENT', 40)),
    afternoon_percent: Number(env('DIGITAL_AFTERNOON_PERCENT', 35)),
    evening_percent: Number(env('DIGITAL_EVENING_PERCENT', 45)),

    /**
     * The most plays a screen's player can send in one request.
     */
    max_plays_per_request: Number(env('DIGITAL_MAX_PLAYS_PER_REQUEST', 500)),
  }
}
