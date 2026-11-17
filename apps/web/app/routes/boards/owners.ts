import { requireUser } from "~/lib/session.server";
import type { Route } from "./+types/owners";

/** Owner suggestions for the tag-a-board form, as JSON. */
export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireUser(request, context);
	const search = new URL(request.url).searchParams.get("search")?.trim() ?? "";

	if (search.length < 2) return { owners: [] };

	try {
		return { owners: (await api.ownerSuggestions(search)).data };
	} catch {
		return { owners: [] };
	}
}
