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

    /*
     * The wording owners read. These can use {owner}, {scout}, {board}, {share} (the owner's
     * percent) and {rate}; the text can also use {link}. Each agreement keeps the wording it was
     * sent with. An empty term is left out.
     */

    /** The text with the signing link. "Hello {first name}, " is put in front of it. */
    sms_text: String(env('AGREEMENT_SMS_TEXT', '{scout} wants to list your board "{board}" on Greyboards and find advertisers for it. Read and sign here: {link}')),

    /** The agreement page's heading. */
    headline: String(env('AGREEMENT_HEADLINE', 'Let Greyboards find advertisers for your board')),

    /** Shown beside the owner's percent. */
    share_line: String(env('AGREEMENT_SHARE_LINE', 'of every booking is yours')),

    /** What the owner agrees to, one point each. */
    term_1: String(env('AGREEMENT_TERM_1', '{scout} handles bookings, printing and putting up ads on this board for you.')),
    term_2: String(env('AGREEMENT_TERM_2', 'You get {share}% of every booking, paid to you once the ad is up. Printing is paid for separately, so it never comes out of your share.')),
    term_3: String(env('AGREEMENT_TERM_3', 'You can stop any time once current bookings end. Just text or call us and we’ll take your board off Greyboards.')),
    term_4: String(env('AGREEMENT_TERM_4', '')),
    term_5: String(env('AGREEMENT_TERM_5', '')),
  }
}
