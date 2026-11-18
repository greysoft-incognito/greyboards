/**
 * Owners' bulk tools: importing boards from a spreadsheet and changing many rates at once.
 * Admins change these in the dashboard; these are the defaults.
 */
export default () => {
  return {
    /**
     * The most boards one import or one price change can cover.
     */
    max_rows: Number(env('IMPORT_MAX_ROWS', 200)),
  }
}
