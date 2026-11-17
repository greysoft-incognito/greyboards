/**
 * Agreements with board owners, who sign by SMS. Admins can change the share in the dashboard.
 */
export default () => {
  return {
    /**
     * The owner's share of each booking on a board a scout runs for them, in percent.
     */
    owner_share_percent: Number(env('OWNER_SHARE_PERCENT', 70)),

    /**
     * Days the signing link in the owner's SMS keeps working.
     */
    link_days: Number(env('AGREEMENT_LINK_DAYS', 14)),

    /**
     * How SMS leave: 'africastalking' or 'twilio' (set up in config/notifications.ts),
     * or 'log' to write them to storage/logs/sms.log instead, for development and tests.
     */
    sms_driver: String(env('SMS_DRIVER', 'log')),

    /**
     * The country code added to local numbers such as 0803 000 0000.
     */
    default_country_code: String(env('SMS_DEFAULT_COUNTRY_CODE', '234')),
  }
}
