import { Link } from "react-router";
import { ArrowRight, PartyPopper } from "lucide-react";
import type { AccountRoleKind } from "@greyboards/types";
import { requireUser } from "~/lib/session.server";
import { ROLE_ICONS, RoleStatus } from "~/components/AccountRoles";
import { BoardScene, type SceneArt, type SceneTime } from "~/components/BoardScene";
import { TaskList } from "~/components/scouting/ScoutingBits";
import type { Route } from "./+types/dashboard";

export const meta = () => [{ title: "Dashboard · Greyboards" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { user, api } = await requireUser(request, context);
	const looksAfterBoards = user.accountRoles.some((role) => (role.kind === "owner" || role.kind === "scout") && role.status === "active");
	const tasks = looksAfterBoards ? await api.tasks().then((result) => result.data).catch(() => []) : null;

	return { user, tasks, welcome: new URL(request.url).searchParams.has("welcome") };
}

/** What each role's area will hold, shown until it has something in it. */
const EMPTY: Record<AccountRoleKind, string> = {
	advertiser: "Your campaigns will show here once you book a board.",
	owner: "Your boards and their bookings will show here once you list one.",
	scout: "Boards you tag and owners you sign will show here.",
	billposter: "Print-and-post jobs near you will show here.",
};

/** The drawn board on each role's card. */
const SCENES: Record<AccountRoleKind, { time: SceneTime; art: SceneArt; headline: string }> = {
	advertiser: { time: "dusk", art: "brand", headline: "Your ad here" },
	owner: { time: "day", art: "empty", headline: "Free from 1 Dec" },
	scout: { time: "night", art: "dark", headline: "New board" },
	billposter: { time: "day", art: "brand", headline: "Up by Friday" },
};

/** The signed-in home: a greeting, then one card for each marketplace role the account holds. */
export default function Dashboard({ loaderData }: Route.ComponentProps) {
	const { user, tasks, welcome } = loaderData;
	const firstName = user.name.split(/\s+/)[0];
	const active = user.accountRoles.filter((role) => role.status === "active").length;
	const pending = user.accountRoles.filter((role) => role.status === "pending").length;

	return (
		<main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
			{welcome && (
				<div className="mb-6 flex items-center gap-3 rounded-2xl bg-brand-50 px-5 py-4 text-brand-800">
					<PartyPopper className="h-5 w-5 shrink-0" aria-hidden />
					<p className="text-sm font-medium">Welcome to Greyboards. Check your inbox to confirm your email.</p>
				</div>
			)}

			<section className="bg-brand-sweep relative overflow-hidden rounded-[1.75rem] p-6 text-white shadow-[0_16px_36px_rgba(88,38,52,0.35)] sm:p-8">
				<p className="text-sm text-brand-100">Your Greyboards</p>
				<h1 className="mt-1 font-display text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">Hello, {firstName}</h1>
				<p className="mt-3 max-w-lg text-brand-100">
					{active === 1 ? "You work in 1 role" : `You work in ${active} roles`}
					{pending ? `, and ${pending === 1 ? "1 application is" : `${pending} applications are`} being checked.` : "."}
				</p>
				<div className="absolute top-1/2 right-8 hidden aspect-[400/260] w-64 -translate-y-1/2 rotate-2 overflow-hidden rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.35)] ring-4 ring-white/10 md:block">
					<BoardScene time="night" art="brand" headline={`Hi, ${firstName}`} />
				</div>
			</section>

			{tasks && tasks.length > 0 && (
				<section className="panel mt-6 space-y-2 p-5 sm:p-6">
					<h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900">To do</h2>
					<TaskList tasks={tasks} limit={6} />
				</section>
			)}

			<div className="mt-6 grid gap-4 md:grid-cols-2">
				{user.accountRoles.map((role) => {
					const Icon = ROLE_ICONS[role.kind];

					return (
						<section key={role.id} className="panel lift flex gap-5 p-4 sm:p-5">
							<div className="h-28 w-32 shrink-0 overflow-hidden rounded-2xl sm:h-32 sm:w-40">
								<BoardScene {...SCENES[role.kind]} />
							</div>
							<div className="flex min-w-0 flex-1 flex-col gap-2 py-1">
								<RoleStatus status={role.status} />
								<div className="flex items-center gap-2">
									<Icon className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />
									<h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900">{role.label}</h2>
								</div>
								<p className="text-sm text-ink-500">
									{role.status === "active"
										? EMPTY[role.kind]
										: role.status === "pending"
											? "We're checking your application. We'll email you when it's done."
											: (role.note ?? "This role isn't active. Contact support if you think that's a mistake.")}
								</p>
							</div>
						</section>
					);
				})}

				<Link prefetch="intent" to="/settings/roles" className="group flex min-h-36 items-center gap-4 rounded-[1.5rem] border-[1.5px] border-dashed border-surface-300 p-6 transition hover:border-brand-300 hover:bg-white">
					<div className="flex-1">
						<h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900">{user.accountRoles.length ? "Do more on Greyboards" : "Choose how you'll use Greyboards"}</h2>
						<p className="mt-1 text-sm text-ink-500">Advertise, list your own boards, scout boards for owners, or print and post.</p>
					</div>
					<span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-white shadow-[0_10px_24px_rgba(131,59,75,0.3)] transition group-hover:translate-x-0.5">
						<ArrowRight className="h-5 w-5" aria-hidden />
						<span className="sr-only">Choose roles</span>
					</span>
				</Link>
			</div>
		</main>
	);
}
