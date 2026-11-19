import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import request from 'parasito'
import { app } from '../src/core/bootstrap'
import { Payment } from '@app/models/Payment'
import { PaymentRegion } from '@app/models/PaymentRegion'
import { ExchangeRates } from '@app/services/payments/ExchangeRates'
import { PaymentOptions } from '@app/services/payments/PaymentOptions'
import { PaymentRegions } from '@app/services/payments/PaymentRegions'
import { Money } from '@app/support/Money'
import { useSettings } from './support/money'

const region = (attributes: Partial<Pick<PaymentRegion, 'currency' | 'provider' | 'exchangeRate' | 'rateMarkup' | 'countries'>>) =>
  new PaymentRegion({ id: 'region-1', name: 'Region', countries: ['US'], provider: null, exchangeRate: null, rateMarkup: null, ...attributes } as never)

describe('Money', () => {
  beforeAll(async () => {
    await request(app).get('/api')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('writes amounts the way people read them, for known and unknown currencies', () => {
    expect(Money.format(120_000_000, 'ngn')).toBe('₦1,200,000')
    expect(Money.format(150_050, 'USD')).toBe('$1,501')
    expect(Money.format(150_000, 'XTS')).toMatch(/^XTS\s1,500$/)
  })

  it('rounds shares down so they never add up to more than the whole', () => {
    expect(Money.share(1_000, 70)).toBe(700)
    expect(Money.share(999, 70)).toBe(699)
    expect(Money.share(1, 99)).toBe(0)
    expect(Money.share(1_000, 100)).toBe(1_000)
  })

  it('charges the payer at least the price in their own currency, by less than one unit over', () => {
    expect(new PaymentOptions('NG', 'NGN', 'flutterwave').charge(17_500_000)).toBe(17_500_000)
    expect(new PaymentOptions('US', 'USD', 'flutterwave', 1 / 1550).charge(155_000_000)).toBe(100_000)

    for (const rate of [1 / 1550, 0.0007, 1.1, 1.025, 13.37, 1550.123456]) {
      for (const amountMinor of [1, 99, 17_500_000, 123_456_789]) {
        const charged = new PaymentOptions(null, 'XXX', 'flutterwave', rate).charge(amountMinor)

        expect(Number.isInteger(charged)).toBe(true)
        expect(charged).toBeGreaterThanOrEqual(Math.round(amountMinor * rate * 10_000) / 10_000)
        expect(charged - amountMinor * rate).toBeLessThan(1)
      }
    }
  })

  it('gives back part of a payment in the currency it was charged in', () => {
    const payment = new Payment({ amountMinor: 155_000_000, chargeAmountMinor: 100_000, currency: 'NGN', chargeCurrency: 'USD' } as never)

    expect(payment.charged(155_000_000)).toBe(100_000)
    expect(payment.charged(77_500_000)).toBe(50_000)
    expect(payment.charged(1)).toBe(0)
    expect(payment.charged(200_000_000)).toBe(100_000)
    expect(new Payment({ amountMinor: 0, chargeAmountMinor: 0 } as never).charged(500)).toBe(500)
  })
})

describe('Payment regions', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reads the payer’s country from the first usable hint', () => {
    expect(PaymentRegions.country('ng')).toBe('NG')
    expect(PaymentRegions.country(' gh ')).toBe('GH')
    expect(PaymentRegions.country('XX', 'T1', 'USA', null, 'us')).toBe('US')
    expect(PaymentRegions.country(undefined, '')).toBeNull()
  })

  it('prices boards in their region’s currency, or the default one outside every region', async () => {
    useSettings({ 'payments.default_currency': 'ngn' })

    vi.spyOn(PaymentRegion, 'covering').mockImplementation(async (country) => (country === 'US' ? region({ currency: 'usd' }) : null))

    expect(await PaymentRegions.currencyFor('US')).toBe('USD')
    expect(await PaymentRegions.currencyFor('NG')).toBe('NGN')
    expect(await PaymentRegions.currencyFor(null)).toBe('NGN')
  })

  it('charges outside every region in the price’s currency, through the default provider', async () => {
    useSettings({ 'payments.default_currency': 'NGN', 'payments.provider': 'flutterwave' })

    vi.spyOn(PaymentRegion, 'covering').mockResolvedValue(null)

    const options = await PaymentRegions.for('FR', 'ngn')

    expect(options.toJSON()).toEqual({ country: 'FR', currency: 'NGN', provider: 'flutterwave', rate: 1, region: null })
  })

  it('uses a region’s fixed rate from the default currency', async () => {
    useSettings({ 'payments.default_currency': 'NGN', 'payments.provider': 'flutterwave' })

    const live = vi.spyOn(ExchangeRates, 'rate').mockResolvedValue(0.0006)

    vi.spyOn(PaymentRegion, 'covering').mockResolvedValue(region({ currency: 'USD', provider: 'stripe', exchangeRate: 0.00065, rateMarkup: 5 }))

    const options = await PaymentRegions.for('US', 'NGN')

    expect(options.toJSON()).toMatchObject({ currency: 'USD', provider: 'stripe', rate: 0.00065, region: { id: 'region-1' } })
    expect(options.charge(100_000_000)).toBe(65_000)
    expect(live).not.toHaveBeenCalled()
  })

  it('uses the live rate with the region’s markup otherwise', async () => {
    useSettings({ 'payments.default_currency': 'NGN', 'payments.provider': 'flutterwave' })

    const live = vi.spyOn(ExchangeRates, 'rate').mockResolvedValue(0.08)

    expect(await PaymentRegions.rate(region({ currency: 'USD', rateMarkup: 2.5 }), 'GHS')).toBeCloseTo(0.082, 10)
    expect(await PaymentRegions.rate(region({ currency: 'USD', exchangeRate: 0.00065 }), 'GHS')).toBe(0.08)
    expect(await PaymentRegions.rate(region({ currency: 'usd', exchangeRate: 0.00065 }), 'USD')).toBe(1)
    expect(live).toHaveBeenCalledWith('GHS', 'USD')
  })

  it('charges through the default provider when the region has none', async () => {
    useSettings({ 'payments.default_currency': 'NGN', 'payments.provider': 'flutterwave' })

    vi.spyOn(PaymentRegion, 'covering').mockResolvedValue(region({ currency: 'NGN' }))

    expect((await PaymentRegions.for('NG', 'NGN')).toJSON()).toMatchObject({ currency: 'NGN', provider: 'flutterwave', rate: 1 })
  })
})
