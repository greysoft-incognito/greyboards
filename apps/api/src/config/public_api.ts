/**
 * The public API agencies call from their own systems with an API key. Admins change these in
 * the dashboard; these are the defaults.
 */
export default () => {
  return {
    /**
     * Whether accounts can make keys and call the public API.
     */
    enabled: Boolean(env('PUBLIC_API_ENABLED', true)),

    /**
     * The most live keys one account can have.
     */
    max_keys: Number(env('PUBLIC_API_MAX_KEYS', 5)),

    /**
     * Requests one key can make each minute.
     */
    requests_per_minute: Number(env('PUBLIC_API_REQUESTS_PER_MINUTE', 120)),
  }
}
