import { describe, expect, it } from 'vitest'

import { Money } from '../src/app/support/Money'

describe('Splitting an amount by weight', () => {
  it('shares in proportion, giving leftover units to the largest remainders', () => {
    expect(Money.allocate(42_500_000, [50_000_000, 17_500_000])).toEqual([31_481_481, 11_018_519])
    expect(Money.allocate(100, [1, 1, 1])).toEqual([34, 33, 33])
    expect(Money.allocate(2, [1, 1, 1])).toEqual([1, 1, 0])
  })

  it('always adds up to the amount, with no part below zero or above its own weight', () => {
    const cases = [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [3, 3, 3],
      [12_500_001, 12_500_000, 12_500_000, 12_499_999],
      [50_000_000, 17_500_000],
      [999_999_999_999, 1],
    ]

    for (const weights of cases) {
      const total = weights.reduce((sum, weight) => sum + weight, 0)

      for (const amountMinor of [0, 1, 2, 5, 6, 7, Math.floor(total / 3), total - 1, total]) {
        const parts = Money.allocate(amountMinor, weights)

        expect(parts.reduce((sum, part) => sum + part, 0)).toBe(amountMinor)
        parts.forEach((part, index) => {
          expect(Number.isInteger(part)).toBe(true)
          expect(part).toBeGreaterThanOrEqual(0)
          expect(part).toBeLessThanOrEqual(weights[index])
        })
      }
    }
  })

  it('gives nothing when there is nothing to weigh by', () => {
    expect(Money.allocate(500, [0, 0])).toEqual([0, 0])
    expect(Money.allocate(500, [])).toEqual([])
  })
})
