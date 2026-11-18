import { useState } from "react";
import { Form, Link, useNavigation } from "react-router";
import { ArrowLeft, ArrowRight, Eye, Tags } from "lucide-react";
import type { PriceChange, PriceRuleResult } from "@greyboards/types";
import { formatMoney } from "~/components/bookings/BookingBits";
import { Alert, Button, Field, Input, Select, Spinner } from "~/components/ui";
import { formError } from "~/lib/api.server";
import { requireUser } from "~/lib/session.server";
import { useToastMessage } from "~/lib/toast";
import type { Route } from "./+types/prices";

export const meta = () => [{ title: "Change rates · Greyboards" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireUser(request, context);
	const { data: boards } = await api.account.boards({ per_page: 100 });

	return { boards };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireUser(request, context);
	const form = await request.formData();
	const change = String(form.get("change")) as PriceChange;
	const raw = Number(form.get("value"));
	// Percents go as they are; amounts are typed in whole units and sent in minor units.
	const value = change === "percent" ? raw : Math.round(raw * 100) * (change === "amount" && form.get("direction") === "down" ? -1 : 1);
	const dryRun = form.get("intent") !== "apply";

	try {
		const { data } = await api.account.priceRule({
			boardIds: form.getAll("boardIds").map(String),
			change,
			value: change === "percent" && form.get("direction") === "down" ? -value : value,
			roundToMinor: Number(form.get("roundTo") || 1000) * 100,
			faces: form.get("faces") === "1",
			dryRun,
		});

		return { error: null, result: data, message: dryRun ? null : `${data.changed} ${data.changed === 1 ? "board" : "boards"} repriced.` };
	} catch (error) {
		return { error: formError(error).error, result: null as PriceRuleResult | null, message: null };
	}
}

/** Owners change many boards' rates at once: up or down by a percent or an amount, or to one amount. */
export default function Prices({ loaderData, actionData }: Route.ComponentProps) {
	useToastMessage(actionData);

	const navigation = useNavigation();
	const busy = (intent: string) => navigation.state !== "idle" && navigation.formData?.get("intent") === intent;
	const { boards } = loaderData;
	const [picked, setPicked] = useState<Set<string>>(() => new Set(boards.filter((board) => board.rate).map((board) => board.id)));
	const [change, setChange] = useState<PriceChange>("percent");
	const result = actionData?.result ?? null;
	const toggle = (id: string) =>
		setPicked((current) => {
			const next = new Set(current);

			if (next.has(id)) next.delete(id);
			else next.add(id);

			return next;
		});

	return (
		<main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
			<Link prefetch="intent" to="/boards" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
				<ArrowLeft className="h-4 w-4" aria-hidden />
				My boards
			</Link>
			<h1 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-4xl">Change rates</h1>
			<p className="mt-1 mb-6 text-ink-500">Update rates for many boards at once. You'll see a preview before saving.</p>

			<Form method="post" className="space-y-6">
				<section className="panel space-y-4 p-5 sm:p-6">
					<h2 className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-ink-900">
						<Tags className="h-5 w-5 text-brand-600" aria-hidden />
						The change
					</h2>
					<div className="grid gap-4 sm:grid-cols-3">
						<Field label="How">
							<Select name="change" value={change} onChange={(event) => setChange(event.target.value as PriceChange)}>
								<option value="percent">By percentage</option>
								<option value="amount">By an amount</option>
								<option value="set">Set one rate</option>
							</Select>
						</Field>
						{change !== "set" && (
							<Field label="Direction">
								<Select name="direction" defaultValue="up">
									<option value="up">Up</option>
									<option value="down">Down</option>
								</Select>
							</Field>
						)}
						<Field label={change === "percent" ? "Percent" : "Amount"} hint={change === "percent" ? undefined : "In each board’s own currency."}>
							<Input name="value" type="number" min="0" step={change === "percent" ? "0.5" : "1000"} required placeholder={change === "percent" ? "10" : "50000"} />
						</Field>
					</div>
					<div className="grid gap-4 sm:grid-cols-2">
						<Field label="Round to the nearest">
							<Select name="roundTo" defaultValue="1000">
								<option value="1">1</option>
								<option value="1000">1,000</option>
								<option value="5000">5,000</option>
								<option value="10000">10,000</option>
							</Select>
						</Field>
						<Field label="Faces with their own rate">
							<Select name="faces" defaultValue="1">
								<option value="1">Change them too</option>
								<option value="0">Leave them</option>
							</Select>
						</Field>
					</div>
					<p className="text-xs text-ink-500">For boards with a guaranteed owner amount, we'll update that amount and adjust the listed rate to match.</p>
				</section>

				<section className="panel space-y-3 p-5 sm:p-6">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<h2 className="font-display text-lg font-extrabold tracking-tight text-ink-900">Boards</h2>
						<button type="button" className="text-sm font-semibold text-brand-700 hover:underline" onClick={() => setPicked(picked.size ? new Set() : new Set(boards.map((board) => board.id)))}>
							{picked.size ? "Pick none" : "Pick all"}
						</button>
					</div>
					{boards.length === 0 && <p className="text-sm text-ink-500">You have no boards yet.</p>}
					<ul className="divide-y divide-surface-200 rounded-2xl border border-surface-200 text-sm">
						{boards.map((board) => {
							const row = result?.rows.find((entry) => entry.boardId === board.id);

							return (
								<li key={board.id}>
									<label className="flex cursor-pointer items-center gap-3 px-4 py-3">
										<input type="checkbox" name="boardIds" value={board.id} checked={picked.has(board.id)} onChange={() => toggle(board.id)} className="h-4 w-4 accent-brand-600" />
										<span className="min-w-0 flex-1 truncate font-semibold text-ink-900">{board.name}</span>
										<span className="flex items-center gap-1.5 text-ink-700 tabular-nums">
											{row && row.beforeMinor !== null && row.afterMinor !== null ? (
												<>
													<span className="text-ink-500 line-through">{formatMoney(row.beforeMinor, board.currency)}</span>
													<ArrowRight className="h-3.5 w-3.5 text-ink-500" aria-hidden />
													<strong className="text-ink-900">{formatMoney(row.afterMinor, board.currency)}</strong>
													{row.ownerNet && <span className="text-xs text-ink-500">for the owner</span>}
												</>
											) : row?.skipped ? (
												<span className="text-ink-500">{row.skipped}</span>
											) : board.rate ? (
												`${formatMoney(board.rate.amountMinor, board.rate.currency)} / ${board.rate.period}`
											) : (
												<span className="text-ink-500">No rate</span>
											)}
										</span>
									</label>
								</li>
							);
						})}
					</ul>
				</section>

				{actionData?.error && <Alert>{actionData.error}</Alert>}
				<div className="flex flex-wrap justify-end gap-2">
					<Button type="submit" name="intent" value="preview" variant="secondary" disabled={!picked.size || busy("preview")}>
						{busy("preview") ? <Spinner /> : <Eye className="h-4 w-4" aria-hidden />}
						Preview
					</Button>
					<Button type="submit" name="intent" value="apply" disabled={!picked.size || !result || !result.dryRun || busy("apply")}>
						{busy("apply") && <Spinner />}
						Save new rates
					</Button>
				</div>
			</Form>
		</main>
	);
}
