/**
 * Taking payments for bookings. Keys stay in .env.
 */
export default () => {
  return {
    /**
     * 'flutterwave', or 'fake' to approve every payment at once for development and tests.
     * The fake driver never runs in production.
     */
    driver: String(env('PAYMENT_DRIVER', 'flutterwave')),

    /**
     * Where payments start each reference. The payment relay routes webhooks to Greyboards by this prefix.
     */
    reference_prefix: String(env('PAYMENT_REFERENCE_PREFIX', 'gbd_')),

    /**
     * The secret the payment relay signs forwarded webhooks with. Once set, webhooks are accepted only from the relay.
     */
    relay_secret: String(env('PAYMENT_RELAY_SECRET', '')),

    /**
     * The name Greyboards is registered under on the payment relay, sent with each payment.
     */
    relay_app: String(env('PAYMENT_RELAY_APP', 'greyboards')),

    flutterwave: {
      public_key: String(env('FLUTTERWAVE_PUBLIC_KEY', '')),
      secret_key: String(env('FLUTTERWAVE_SECRET_KEY', '')),
      /**
       * The secret hash set under Webhooks in the Flutterwave dashboard. Flutterwave sends it back as `verif-hash`.
       */
      webhook_hash: String(env('FLUTTERWAVE_WEBHOOK_HASH', '')),
      api_url: String(env('FLUTTERWAVE_API_URL', 'https://api.flutterwave.com/v3')),
    },
  }
}
