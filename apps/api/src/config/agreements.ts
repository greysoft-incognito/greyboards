/**
 * Agreements with board owners, who sign by SMS. The owner's share comes from config/revenue.ts.
 */
export default () => {
  return {
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
