import { Link, Outlet, useLocation } from "react-router";
import { requireUser } from "~/lib/session.server";
import { AppHeader } from "~/components/AppHeader";
import { revalidateOnSubmit } from "~/lib/revalidate";
import type { Route } from "./+types/app-layout";

export async function loader({ request, context }: Route.LoaderArgs) {
	const { user } = await requireUser(request, context);
	return { user };
}

export const shouldRevalidate = revalidateOnSubmit;

export default function AppLayout({ loaderData }: Route.ComponentProps) {
	const { user } = loaderData;
	const { pathname } = useLocation();

	return (
		<div className="min-h-dvh bg-canvas">
			<AppHeader user={user} />
			{!user.emailVerified && !pathname.startsWith("/settings/email") && (
				<div className="px-3 pt-3 sm:px-5">
					<p className="mx-auto max-w-7xl rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-[0_1px_2px_rgba(30,31,34,0.05)]">
						Confirm your email so you can always get back into your account.{" "}
						<Link prefetch="intent" to="/settings/email" className="font-semibold underline">
							Resend the link
						</Link>
					</p>
				</div>
			)}
			<Outlet />
		</div>
	);
}
