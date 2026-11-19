import { useRouteLoaderData } from "react-router";
import type { CurrencyInfo } from "@greyboards/types";

/** Used when the API can't be reached. */
export const FALLBACK_CURRENCY: CurrencyInfo = { country: null, currency: "NGN", default: "NGN", regions: {} };

/** The visitor's country and currency, the default currency, and each payment region's currency, loaded once by the root route. */
export function useCurrency(): CurrencyInfo {
	return (useRouteLoaderData("root") as { currency?: CurrencyInfo } | undefined)?.currency ?? FALLBACK_CURRENCY;
}

/** The currency boards in `country` are priced in. */
export function currencyFor(info: CurrencyInfo, country: string | null | undefined): string {
	return (country && info.regions[country.toUpperCase()]) || info.default;
}
