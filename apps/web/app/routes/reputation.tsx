import { Award, Gauge, Minus, Plus, ShieldCheck } from "lucide-react";
import type { AccountRoleKind } from "@greyboards/types";
import { cloudflareContext } from "~/lib/cloudflare";
import { getServerApi } from "~/lib/api.server";
import { ROLE_ICONS } from "~/components/AccountRoles";
import { BADGES } from "~/components/reputation/Badges";
import type { Route } from "./+types/reputation";

export const meta = () => [
	{ title: "Reputation and badges · Greyboards" },
	{ name: "description", content: "What the Verified and Proven badges mean on Greyboards, and how reputation is earned." },
];

const ROLE_NAMES: Record<AccountRoleKind, string> = { advertiser: "Advertisers", owner: "Owners", scout: "Scouts", dispatch: "Dispatchers" };

/** What reputation and the two badges mean, with the numbers in use now. Open to everyone who sees a badge. */
export async function loader({ request, context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	const api = await getServerApi(request, env, null);

	return (await api.reputation()).data;
}

export default function ReputationPage({ loaderData }: Route.ComponentProps) {
	const { badges, rules } = loaderData;

	return (
		<main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
			<section className="bg-brand-sweep rounded-[1.75rem] p-6 text-white shadow-[0_16px_36px_rgba(88,38,52,0.35)] sm:p-9">
				<Gauge className="h-8 w-8 text-brand-100" aria-hidden />
				<h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Reputation and badges</h1>
				<p className="mt-3 max-w-2xl text-brand-50/90">
					A reputation score shows how much you can trust someone in a role. Each role has its own score, and it only moves for real work we could confirm.
				</p>
			</section>

			<div className="mt-8 grid gap-4 sm:grid-cols-2">
				{badges.map((badge) => {
					const Icon = badge.key === "verified" ? ShieldCheck : Award;

					return (
						<article key={badge.key} className="panel p-6">
							<span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${BADGES[badge.key].className}`}>
								<Icon className={`h-4 w-4 ${badge.key === "proven" ? "text-amber-500" : ""}`} aria-hidden />
								{BADGES[badge.key].label}
							</span>
							<h2 className="mt-4 font-display text-xl font-bold text-ink-900">{badge.label}</h2>
							<p className="mt-1 text-sm font-semibold text-ink-700">{badge.summary}</p>
							<p className="mt-3 text-sm leading-relaxed text-ink-500">{badge.description}</p>
						</article>
					);
				})}
			</div>

			<section className="panel mt-8 overflow-hidden">
				<h2 className="border-b border-surface-100 px-6 py-4 font-display text-lg font-bold text-ink-900">What moves a score</h2>
				<ul className="divide-y divide-surface-100">
					{rules.map((rule) => (
						<li key={rule.action} className="flex flex-wrap items-center gap-4 px-6 py-4">
							<span
								className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${rule.points < 0 ? "bg-red-50 text-red-700" : "bg-brand-50 text-brand-600"}`}
								aria-hidden
							>
								{rule.points < 0 ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
							</span>
							<div className="min-w-0 flex-1 basis-56">
								<p className="text-sm font-medium text-ink-900">{rule.label}</p>
								<p className="mt-1 flex flex-wrap gap-2 text-xs text-ink-500">
									{rule.roles.map((kind) => {
										const RoleIcon = ROLE_ICONS[kind];

										return (
											<span key={kind} className="inline-flex items-center gap-1">
												<RoleIcon className="h-3.5 w-3.5" aria-hidden />
												{ROLE_NAMES[kind]}
											</span>
										);
									})}
								</p>
							</div>
							<span className={`font-display text-lg font-extrabold tabular-nums ${rule.points < 0 ? "text-red-700" : "text-ink-900"}`}>
								{rule.points > 0 ? `+${rule.points}` : rule.points}
							</span>
						</li>
					))}
					<li className="px-6 py-4 text-sm text-ink-500">Greyboards staff can also correct a score by hand, and always record why.</li>
				</ul>
			</section>
		</main>
	);
}
