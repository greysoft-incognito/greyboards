import { Outlet } from "react-router";
import { optionalUser } from "~/lib/session.server";
import { AppHeader } from "~/components/AppHeader";
import { SiteFooter } from "~/components/SiteFooter";
import { revalidateOnSubmit } from "~/lib/revalidate";
import type { Route } from "./+types/site-layout";

/** Public pages open to everyone; signed-in people keep their usual header. */
export async function loader({ request, context }: Route.LoaderArgs) {
	return { user: await optionalUser(request, context) };
}

export const shouldRevalidate = revalidateOnSubmit;

export default function SiteLayout({ loaderData }: Route.ComponentProps) {
	return (
		<div className="flex min-h-dvh flex-col bg-canvas">
			<AppHeader user={loaderData.user} />
			<div className="flex-1">
				<Outlet />
			</div>
			<SiteFooter />
		</div>
	);
}
