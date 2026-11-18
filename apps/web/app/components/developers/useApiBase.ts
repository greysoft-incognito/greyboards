import { useRouteLoaderData } from "react-router";

/** The public API's address, from the developer pages' layout. */
export function useApiBase() {
	const data = useRouteLoaderData("routes/developers/layout") as { apiBase: string } | undefined;

	return data?.apiBase ?? "/api/v1";
}
