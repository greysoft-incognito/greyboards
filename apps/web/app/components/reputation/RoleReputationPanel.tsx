import { Link } from "react-router";
import type { RoleReputation, ReputationEvent } from "@greyboards/types";
import { Score } from "./Badges";

const day = (value: string) => new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

function Progress({ label, have, need, unit }: { label: string; have: number; need: number; unit: string }) {
	const share = need > 0 ? Math.min(100, Math.max(0, (have / need) * 100)) : 100;

	return (
		<div>
			<div className="flex justify-between text-xs">
				<span className="font-medium text-ink-700">{label}</span>
				<span className="tabular-nums text-ink-500">
					{Math.min(have, need)} / {need} {unit}
				</span>
			</div>
			<div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-100">
				<div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600" style={{ width: `${share}%` }} />
			</div>
		</div>
	);
}

/** A role's score, badges, how far it is from the proven badge, and its latest changes. */
export function RoleReputationPanel({ reputation, history }: { reputation: RoleReputation; history: ReputationEvent[] }) {
	const { progress } = reputation;

	return (
		<div className="mt-5 rounded-[1.25rem] bg-surface-100/60 p-4 sm:p-5">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h3 className="text-sm font-bold text-ink-900">Reputation in this role</h3>
				<Score value={reputation.score} />
			</div>
			{reputation.verifiedAt && <p className="mt-2 text-xs text-ink-500">Verified by Greyboards staff on {day(reputation.verifiedAt)}.</p>}
			{reputation.provenAt ? (
				<p className="mt-1 text-xs text-ink-500">Proven on {day(reputation.provenAt)}.</p>
			) : (
				<div className="mt-4 grid gap-3 sm:grid-cols-3">
					<Progress label="Score" have={progress.score.have} need={progress.score.need} unit="points" />
					<Progress label="Checked actions" have={progress.actions.have} need={progress.actions.need} unit="" />
					<Progress label="Days in role" have={progress.days.have} need={progress.days.need} unit="days" />
				</div>
			)}
			{history.length > 0 && (
				<ul className="mt-4 space-y-2">
					{history.map((event) => (
						<li key={event.id} className="flex items-start gap-3 text-sm">
							<span className={`w-12 shrink-0 text-right font-bold tabular-nums ${event.points < 0 ? "text-red-700" : "text-available"}`}>{event.points > 0 ? `+${event.points}` : event.points}</span>
							<span className="min-w-0 flex-1 text-ink-700">
								{event.label}
								{event.note ? `: ${event.note}` : ""}
								<span className="block text-xs text-ink-500">{day(event.createdAt)}</span>
							</span>
						</li>
					))}
				</ul>
			)}
			<p className="mt-4 text-xs text-ink-500">
				Points only come from work Greyboards could check.{" "}
				<Link to="/reputation" className="font-semibold text-brand-600 hover:underline">
					See what earns them and what the badges mean
				</Link>
			</p>
		</div>
	);
}
