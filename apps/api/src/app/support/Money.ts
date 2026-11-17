/** Amounts kept in minor units (kobo for NGN), shown the way people write them. */
export class Money {
  /** Such as "₦1,200,000". */
  static format(amountMinor: number, currency: string): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amountMinor / 100)
  }

  /** `percent` of an amount, rounded down to a whole minor unit so shares never add up to more than the whole. */
  static share(amountMinor: number, percent: number): number {
    return Math.floor((amountMinor * percent) / 100)
  }
}
