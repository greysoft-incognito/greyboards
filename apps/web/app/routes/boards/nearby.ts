import type { NearbyBoard } from "@greyboards/types";
import { requireUser } from "~/lib/session.server";
import type { Route } from "./+types/nearby";

/** Boards already tagged where the form's pin is, as JSON, so nobody tags one twice. */
export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireUser(request, context);
	const params = new URL(request.url).searchParams;
	const lat = Number(params.get("lat"));
	const lng = Number(params.get("lng"));

	if (!params.get("lat") || !params.get("lng") || !Number.isFinite(lat) || !Number.isFinite(lng)) return { boards: [] as NearbyBoard[] };

	try {
		return { boards: (await api.account.nearbyBoards({ lat, lng })).data };
	} catch {
		return { boards: [] as NearbyBoard[] };
	}
}
