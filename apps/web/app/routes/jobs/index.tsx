import { useState } from "react";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router";
import { LocateFixed, Printer } from "lucide-react";
import type { PrintJob } from "@greyboards/types";
import { heldRole } from "~/components/AccountRoles";
import { BoardScene } from "~/components/BoardScene";
import { JobRow } from "~/components/jobs/JobBits";
import { Pager } from "~/components/Pager";
import { Alert, Button, buttonClass, Spinner } from "~/components/ui";
import { requireUser } from "~/lib/session.server";
import type { Route } from "./+types/index";

export const meta = () => [{ title: "Print jobs · Greyboards" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api, user } = await requireUser(request, context);
	const params = new URL(request.url).searchParams;
	const role = heldRole(user.accountRoles, "dispatch");
	const mine = params.get("view") === "mine";
	const lat = Number(params.get("lat"));
	const lng = Number(params.get("lng"));
	const located = params.has("lat") && params.has("lng") && Number.isFinite(lat) && Number.isFinite(lng);

	if (role?.status !== "active") return { roleStatus: role?.status ?? null, mine, located, jobs: [] as PrintJob[], meta: null };

	if (mine) {
		const result = await api.printJobs.mine({ page: Number(params.get("page")) || 1 });

		return { roleStatus: role.status, mine, located, jobs: result.data, meta: result.meta };
	}

	const jobs = located ? (await api.printJobs.near({ lat, lng })).data : [];

	return { roleStatus: role.status, mine, located, jobs, meta: null };
}

const tab = ({ isActive }: { isActive: boolean }) =>
	`rounded-xl px-4 py-2 text-sm font-semibold transition ${isActive ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-surface-100"}`;

/** Dispatchers find open print jobs near them, and follow the ones they took. */
export default function Jobs({ loaderData }: Route.ComponentProps) {
	const { roleStatus, mine, located, jobs, meta } = loaderData;

	return (
		<main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-4xl">Print jobs</h1>
					<p className="mt-1 text-ink-500">{mine ? "Jobs you took, the soonest due first." : "Approved artwork near you, waiting for your price to print and put it up."}</p>
				</div>
				{roleStatus === "active" && (
					<nav aria-label="Print jobs" className="glass flex gap-1 rounded-2xl p-1">
						<NavLink to="/jobs" end className={() => tab({ isActive: !mine })}>
							Near me
						</NavLink>
						<NavLink to="/jobs?view=mine" className={() => tab({ isActive: mine })}>
							My jobs
						</NavLink>
						<NavLink to="/jobs/prices" className={() => tab({ isActive: false })}>
							Prices
						</NavLink>
					</nav>
				)}
			</div>

			{roleStatus !== "active" ? (
				<RoleNeeded status={roleStatus} />
			) : !mine && !located ? (
				<FindMe />
			) : jobs.length ? (
				<div className="mt-6 space-y-3">
					{!mine && <FindMe compact />}
					{jobs.map((job) => (
						<JobRow key={job.id} job={job} />
					))}
					{meta && <Pager meta={meta} noun="jobs" />}
				</div>
			) : (
				<Empty mine={mine} />
			)}
		</main>
	);
}

/** Asks the browser where the dispatcher is, then searches around it. */
function FindMe({ compact = false }: { compact?: boolean }) {
	const navigate = useNavigate();
	const [params] = useSearchParams();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const locate = () => {
		if (!("geolocation" in navigator)) return setError("This browser can't tell where you are.");

		setBusy(true);
		setError(null);
		navigator.geolocation.getCurrentPosition(
			(position) => {
				const next = new URLSearchParams(params);

				next.set("lat", position.coords.latitude.toFixed(5));
				next.set("lng", position.coords.longitude.toFixed(5));
				setBusy(false);
				navigate(`/jobs?${next}`, { replace: true });
			},
			() => {
				setBusy(false);
				setError("We couldn't get your location. Allow location for this site and try again.");
			},
			{ enableHighAccuracy: false, timeout: 15_000, maximumAge: 300_000 },
		);
	};

	const button = (
		<Button variant={compact ? "secondary" : "primary"} onClick={locate} disabled={busy}>
			{busy ? <Spinner /> : <LocateFixed className="h-4 w-4" aria-hidden />}
			{compact ? "Search from where I am now" : "Find jobs near me"}
		</Button>
	);

	if (compact) return <div className="flex flex-wrap items-center justify-end gap-3">{error ? <Alert>{error}</Alert> : null}{button}</div>;

	return (
		<div className="panel mt-6 flex flex-col items-center gap-4 px-6 py-10 text-center">
			<span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
				<Printer className="h-7 w-7" aria-hidden />
			</span>
			<div className="max-w-md">
				<h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900">Jobs close to you</h2>
				<p className="mt-1 text-sm text-ink-500">We show boards with approved artwork near where you are, nearest first. Your location is only used for this search.</p>
			</div>
			{button}
			{error && <Alert>{error}</Alert>}
		</div>
	);
}

function RoleNeeded({ status }: { status: string | null }) {
	return (
		<div className="panel mt-6 flex flex-col items-center gap-4 px-6 py-10 text-center">
			<p className="max-w-md text-ink-700">
				{status === "pending"
					? "Your dispatcher application is being checked. Jobs show here once it's approved."
					: "Print jobs are for dispatchers. Apply for the role and we'll check your details."}
			</p>
			{status !== "pending" && (
				<Link prefetch="intent" to="/settings/roles" className={buttonClass("primary")}>
					Become a dispatcher
				</Link>
			)}
		</div>
	);
}

function Empty({ mine }: { mine: boolean }) {
	return (
		<div className="panel mt-6 overflow-hidden">
			<div className="h-44 sm:h-56">
				<BoardScene time="dusk" art="empty" headline={mine ? "No jobs yet" : "Nothing nearby"} />
			</div>
			<div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
				<p className="max-w-md text-ink-700">{mine ? "Jobs you reserve show here, with the artwork to print." : "No open jobs within reach right now. New ones appear as advertisers' artwork is approved."}</p>
				{mine && (
					<Link prefetch="intent" to="/jobs" className={buttonClass("primary")}>
						Find jobs near me
					</Link>
				)}
			</div>
		</div>
	);
}
