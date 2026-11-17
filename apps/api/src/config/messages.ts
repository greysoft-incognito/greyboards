/**
 * Messages about a booking. Admins change these in the dashboard; these are the defaults.
 */
export default () => {
  return {
    /**
     * Whether owners whose board a scout runs, and who have no account, get each new message by SMS.
     */
    sms_owners: Boolean(env('MESSAGES_SMS_OWNERS', true)),

    /**
     * The longest message, in characters.
     */
    max_length: Number(env('MESSAGES_MAX_LENGTH', 2000)),
  }
}
