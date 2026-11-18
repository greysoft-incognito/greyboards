import { Form } from "react-router";
import { ChevronRight, ShieldCheck, ShieldOff } from "lucide-react";
import type { AccountRole, ReputationEvent } from "@greyboards/types";
import { Standing } from "~/components/reputation/Badges";
import { Button, Input } from "~/components/ui";

const day = (value: string) => new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/** For staff: verify a role by hand or take it back, correct its score with a reason, and see its latest changes. */
export function RoleReputationControls({ role, history, canManage, busy }: { role: AccountRole; history: ReputationEvent[]; canManage: boolean; busy: boolean }) {
	const { reputation } = role;

	return (
		<div className="w-full rounded-[1.25rem] bg-surface-100/60 px-4 py-3">
			<div className="flex flex-wrap items-center gap-2">
				<Standing standing={reputation} />
				<span className="text-xs text-ink-500">
					{reputation.actions} checked {reputation.actions === 1 ? "action" : "actions"}
					{reputation.verifiedAt ? ` · verified ${day(reputation.verifiedAt)}` : ""}
					{reputation.provenAt ? ` · proven ${day(reputation.provenAt)}` : ""}
				</span>
			</div>

			{canManage && (
				<details className="group mt-3">
					<summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">
						<ChevronRight className="h-4 w-4 transition group-open:rotate-90" aria-hidden />
						Verify or correct the score
					</summary>
					<div className="mt-3 grid gap-3 lg:grid-cols-2">
						<Form method="post" preventScrollReset className="flex gap-2">
							<input type="hidden" name="roleId" value={role.id} />
							{reputation.verifiedAt ? (
								<Button type="submit" name="intent" value="unverify" variant="secondary" disabled={busy} className="!py-2">
									<ShieldOff className="h-4 w-4" aria-hidden />
									Remove verification
								</Button>
							) : (
								<>
									<Input name="note" placeholder="How you checked them (optional)" maxLength={191} className="min-w-0 flex-1 !bg-white !py-2 text-sm" aria-label="How you checked them" />
									<Button type="submit" name="intent" value="verify" disabled={busy || role.status !== "active"} className="!py-2">
										<ShieldCheck className="h-4 w-4" aria-hidden />
										Verify
									</Button>
								</>
							)}
						</Form>
						<Form method="post" preventScrollReset className="flex gap-2">
							<input type="hidden" name="roleId" value={role.id} />
							<Input name="points" type="number" step={1} required placeholder="± points" className="!w-24 shrink-0 !bg-white !py-2 text-sm" aria-label="Points to add or take away" />
							<Input name="note" required minLength={3} maxLength={191} placeholder="Why the score changes" className="min-w-0 flex-1 !bg-white !py-2 text-sm" aria-label="Why the score changes" />
							<Button type="submit" name="intent" value="adjust" variant="secondary" disabled={busy} className="!py-2">
								Correct
							</Button>
						</Form>
					</div>
				</details>
			)}

			{history.length > 0 && (
				<ul className="mt-4 space-y-1.5 text-sm">
					{history.map((event) => (
						<li key={event.id} className="flex gap-3">
							<span className={`w-12 shrink-0 text-right font-bold tabular-nums ${event.points < 0 ? "text-red-700" : "text-available"}`}>{event.points > 0 ? `+${event.points}` : event.points}</span>
							<span className="min-w-0 flex-1 text-ink-700">
								{event.label}
								{event.note ? `: ${event.note}` : ""} <span className="text-xs text-ink-500">· {day(event.createdAt)}</span>
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
