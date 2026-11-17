import { getServerApi } from "~/lib/api.server";
import { cloudflareContext } from "~/lib/cloudflare";
import { apiBounds, readFilters } from "~/lib/map";
import type { Route } from "./+types/data";

/** Boards in the map's view, as JSON: every pin, and the first page of cards for the list. */
export async function loader({ request, context }: Route.LoaderArgs) {
	const params = new URL(request.url).searchParams;
	const [west, south, east, north] = ["west", "south", "east", "north"].map((edge) => Number(params.get(edge)));

	if (![west, south, east, north].every(Number.isFinite)) return { pins: [], truncated: false, boards: [], total: 0 };

	const api = await getServerApi(request, context.get(cloudflareContext).env);
	const filters = readFilters(params);
	const search = {
		...apiBounds(west, south, east, north),
		kind: filters.kind ?? undefined,
		lit: filters.lit ?? undefined,
		maxRateMinor: filters.maxRateMinor ?? undefined,
	};
	const [pins, boards] = await Promise.all([api.boardPins(search), api.boards({ ...search, per_page: 20 })]);

	return { pins: pins.data, truncated: pins.meta.truncated, boards: boards.data, total: boards.meta.total };
}
