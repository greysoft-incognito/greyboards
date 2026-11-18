import type { PriceGuide, PriceGuideQuery } from "@greyboards/types";
import { requireUser } from "~/lib/session.server";
import type { Route } from "./+types/price-guide";

/** A suggested rate for the board form, as JSON: boards like it nearby, and what its traffic is worth. */
export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireUser(request, context);
	const params = new URL(request.url).searchParams;
	const number = (key: string) => (params.get(key) ? Number(params.get(key)) : Number.NaN);
	const query: PriceGuideQuery = {
		lat: number("lat"),
		lng: number("lng"),
		kind: (params.get("kind") ?? "billboard") as PriceGuideQuery["kind"],
		widthM: number("widthM"),
		heightM: number("heightM"),
		period: params.get("period") === "week" ? "week" : "month",
		roadClass: (params.get("roadClass") || null) as PriceGuideQuery["roadClass"],
		dailyTraffic: params.get("dailyTraffic") ? number("dailyTraffic") : null,
		...(params.get("except") ? { except: String(params.get("except")) } : {}),
	};

	if (![query.lat, query.lng, query.widthM, query.heightM].every(Number.isFinite)) return { guide: null as PriceGuide | null };

	try {
		return { guide: (await api.account.priceGuide(query)).data };
	} catch {
		return { guide: null as PriceGuide | null };
	}
}
