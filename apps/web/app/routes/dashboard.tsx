import { Link } from "react-router";
import { ArrowRight, PartyPopper } from "lucide-react";
import type { AccountRoleKind } from "@greyboards/types";
import { requireUser } from "~/lib/session.server";
import { ROLE_ICONS, RoleStatus } from "~/components/AccountRoles";
import { buttonClass } from "~/components/ui";
import type { Route } from "./+types/dashboard";

export const meta = () => [{ title: "Dashboard · Greyboards" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { user } = await requireUser(request, context);

	return { user, welcome: new URL(request.url).searchParams.has("welcome") };
}

/** What each role's area will hold, shown until it has something in it. */
const EMPTY: Record<AccountRoleKind, string> = {
	advertiser: "Your campaigns will show here once you book a board.",
	owner: "Your boards and their bookings will show here once you list one.",
	scout: "Boards you tag and owners you sign will show here.",
	billposter: "Print-and-post jobs near you will show here.",
};

/** The signed-in home: one card for each marketplace role the account holds. */
export default function Dashboard({ loaderData }: Route.ComponentProps) {
	const { user, welcome } = loaderData;
	const firstName = user.name.split(/\s+/)[0];

	return (
		<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
			{welcome && (
				<div className="mb-8 flex items-center gap-3 rounded-2xl border-[1.5px] border-brand-200 bg-brand-50 px-5 py-4 text-brand-800">
					<PartyPopper className="h-5 w-5 shrink-0" aria-hidden />
					<p className="text-sm font-medium">Welcome to Greyboards. Check your inbox to confirm your email.</p>
				</div>
			)}
			<h1 className="font-display text-4xl font-extrabold tracking-tight text-ink-900">Hello, {firstName}</h1>
			<p className="mt-2 text-ink-500">Everything you do on Greyboards, in one place.</p>

			<div className="mt-8 grid gap-4 md:grid-cols-2">
				{user.accountRoles.map((role) => {
					const Icon = ROLE_ICONS[role.kind];

					return (
						<section key={role.id} className="panel flex flex-col gap-4 rounded-3xl p-6">
							<div className="flex items-center gap-3">
								<span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
									<Icon className="h-5 w-5" aria-hidden />
								</span>
								<h2 className="flex-1 font-display text-xl font-bold text-ink-900">{role.label}</h2>
								<RoleStatus status={role.status} />
							</div>
							<p className="text-sm text-ink-500">
								{role.status === "active"
									? EMPTY[role.kind]
									: role.status === "pending"
										? "We're checking your application. We'll email you when it's done."
										: (role.note ?? "This role isn't active. Contact support if you think that's a mistake.")}
							</p>
						</section>
					);
				})}

				<Link prefetch="intent" to="/settings/roles" className="panel flex items-center gap-4 rounded-3xl border-dashed p-6 transition hover:border-brand-300">
					<div className="flex-1">
						<h2 className="font-display text-xl font-bold text-ink-900">{user.accountRoles.length ? "Do more on Greyboards" : "Choose how you'll use Greyboards"}</h2>
						<p className="mt-1 text-sm text-ink-500">Advertise, list your own boards, scout boards for owners, or print and post.</p>
					</div>
					<span className={buttonClass("secondary", "!px-3")}>
						<ArrowRight className="h-4 w-4" aria-hidden />
						<span className="sr-only">Choose roles</span>
					</span>
				</Link>
			</div>
		</main>
	);
}
