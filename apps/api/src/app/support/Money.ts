import { Money as Amount, currencies } from '@toneflix/money'
import type { CurrencyCode } from '@toneflix/money/types'

const KNOWN = new Set(currencies.map((currency) => currency.code as string))

/** Amounts kept in minor units (kobo for NGN, cents for USD), shown the way people write them. */
export class Money {
  /** Such as "₦1,200,000". Currencies @toneflix/money doesn't know are written by Intl. */
  static format(amountMinor: number, currency: string): string {
    const code = currency.toUpperCase()

    if (!KNOWN.has(code)) return new Intl.NumberFormat('en', { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(amountMinor / 100)

    return Amount.whole(Math.round(amountMinor / 100), code as CurrencyCode)
  }

  /** `percent` of an amount, rounded down to a whole minor unit so shares never add up to more than the whole. */
  static share(amountMinor: number, percent: number): number {
    return Math.floor((amountMinor * percent) / 100)
  }

  /** `amountMinor` split in proportion to whole-number `weights`, in whole minor units that add up to it. Leftover units go to the largest remainders. */
  static allocate(amountMinor: number, weights: number[]): number[] {
    const total = BigInt(weights.reduce((sum, weight) => sum + weight, 0))

    if (total <= 0n) return weights.map(() => 0)

    const exact = weights.map((weight) => BigInt(amountMinor) * BigInt(weight))
    const parts = exact.map((value) => Number(value / total))
    const byRemainder = exact.map((value, index) => ({ index, remainder: value % total })).sort((a, b) => Number(b.remainder - a.remainder) || a.index - b.index)
    let left = amountMinor - parts.reduce((sum, part) => sum + part, 0)

    for (const { index } of byRemainder) {
      if (left <= 0) break

      parts[index]++
      left--
    }

    return parts
  }
}
