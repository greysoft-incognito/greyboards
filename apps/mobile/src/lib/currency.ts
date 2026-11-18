import { useEffect, useSyncExternalStore } from 'react'
import type { CurrencyInfo } from '@greyboards/types'
import { api } from './api'
import { deviceCountry } from './device'

/** Used until `/currency` answers, or when the API can't be reached. */
export const FALLBACK_CURRENCY: CurrencyInfo = { country: null, currency: 'NGN', default: 'NGN', regions: {} }

/** The device's country and currency, the default currency, and each payment region's currency, from `/currency`. */
export class CurrencyStore {
  private info: CurrencyInfo = FALLBACK_CURRENCY
  private loading: Promise<CurrencyInfo> | null = null
  private listeners = new Set<() => void>()

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = () => this.info

  load() {
    this.loading ??= api
      .currency(deviceCountry())
      .send()
      .then(({ data }) => this.publish(data))
      .catch(() => {
        this.loading = null

        return this.info
      })

    return this.loading
  }

  private publish(info: CurrencyInfo) {
    this.info = info
    this.listeners.forEach((listener) => listener())

    return info
  }
}

export const appCurrency = new CurrencyStore()

export function useCurrency(): CurrencyInfo {
  const info = useSyncExternalStore(appCurrency.subscribe, appCurrency.getSnapshot)

  useEffect(() => {
    appCurrency.load()
  }, [])

  return info
}

/** The currency boards in `country` are priced in. */
export function currencyFor(info: CurrencyInfo, country: string | null | undefined): string {
  return (country && info.regions[country.toUpperCase()]) || info.default
}
