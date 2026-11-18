import { useState } from "react";
import { Form, Link, NavLink, useNavigation } from "react-router";
import { LocateFixed, Save } from "lucide-react";
import { type PrintOffer, currencySymbol } from "@greyboards/types";
import { heldRole } from "~/components/AccountRoles";
import { formatDay, formatMoney } from "~/components/bookings/BookingBits";
import { Pager } from "~/components/Pager";
import { Alert, Button, Field, Input, Spinner } from "~/components/ui";
import { formError } from "~/lib/api.server";
import { useCurrency } from "~/lib/currency";
import { requireUser } from "~/lib/session.server";
import { useToastMessage } from "~/lib/toast";
import type { Route } from "./+types/prices";

export const meta = () => [{ title: "Your prices · Print jobs · Greyboards" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api, user } = await requireUser(request, context);
	const role = heldRole(user.accountRoles, "dispatch");

	if (role?.status !== "active") throw new Response("Not found", { status: 404 });

	const page = Number(new URL(request.url).searchParams.get("page")) || 1;
	const [{ data: rate }, offers] = await Promise.all([api.printJobs.rate(), api.printJobs.offers({ page })]);

	return { rate, offers: offers.data, meta: offers.meta };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireUser(request, context);
	const form = await request.formData();
	const minor = (name: string) => Math.round(Number(String(form.get(name) ?? "").replace(/[^\d.]/g, "")) * 100);

	try {
		await api.printJobs.saveRate({
			pricePerSqmMinor: minor("perSqm"),
			minFeeMinor: minor("minFee") || 0,
			latitude: Number(form.get("latitude")),
			longitude: Number(form.get("longitude")),
			radiusKm: Number(form.get("radiusKm")),
			note: String(form.get("note") ?? "").trim() || null,
		});

		return { error: null, message: "Your prices are saved.", fieldErrors: {} as Record<string, string> };
	} catch (error) {
		return { message: null, ...formError(error) };
	}
}

const OFFER_LABELS: Record<PrintOffer["status"], string> = {
	requested: "Requested at your rate",
	pending: "Waiting for advertiser",
	paid: "Paid, it's yours",
	declined: "Declined",
	withdrawn: "Withdrawn",
	closed: "Closed",
};

/** What a dispatcher charges and where they work, with their prices and the requests made to them. */
export default function Prices({ loaderData, actionData }: Route.ComponentProps) {
	useToastMessage(actionData);

	const { rate, offers, meta } = loaderData;
	const busy = useNavigation().state === "submitting";
	const [spot, setSpot] = useState({ latitude: rate.latitude === null ? "" : String(rate.latitude), longitude: rate.longitude === null ? "" : String(rate.longitude) });
	const errors = actionData?.fieldErrors ?? {};
	const symbol = currencySymbol(useCurrency().currency);

	const locate = () =>
		navigator.geolocation?.getCurrentPosition((position) => setSpot({ latitude: position.coords.latitude.toFixed(5), longitude: position.coords.longitude.toFixed(5) }));

	return (
		<main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-4xl">Your prices</h1>
					<p className="mt-1 text-ink-500">Advertisers near you can hire you at this rate. You can also send your own quote on any job.</p>
				</div>
				<nav aria-label="Print jobs" className="glass flex gap-1 rounded-2xl p-1">
					<NavLink to="/jobs" end className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-surface-100">
						Near me
					</NavLink>
					<NavLink to="/jobs?view=mine" className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-surface-100">
						My jobs
					</NavLink>
					<span className="rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white">Prices</span>
				</nav>
			</div>

			<div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
				<Form method="post" className="panel space-y-4 p-5 sm:p-6">
					<h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900">Your rate</h2>
					{!rate.saved && <p className="text-sm text-ink-500">Set your rate and location so advertisers can find you.</p>}
					{actionData?.error && !Object.keys(errors).length && <Alert>{actionData.error}</Alert>}
					<div className="grid gap-4 sm:grid-cols-2">
						<Field label="Per square metre" error={errors.pricePerSqmMinor} hint="In the currency of the boards near your base.">
							<Input name="perSqm" inputMode="numeric" required defaultValue={String(rate.pricePerSqmMinor / 100)} addon={symbol} />
						</Field>
						<Field label="Minimum charge" error={errors.minFeeMinor} hint="Optional. The least you’ll charge for a small board.">
							<Input name="minFee" inputMode="numeric" defaultValue={rate.minFeeMinor ? String(rate.minFeeMinor / 100) : ""} addon={symbol} />
						</Field>
						<Field label="Base latitude" error={errors.latitude}>
							<Input name="latitude" inputMode="decimal" required value={spot.latitude} onChange={(event) => setSpot({ ...spot, latitude: event.target.value })} />
						</Field>
						<Field label="Base longitude" error={errors.longitude}>
							<Input name="longitude" inputMode="decimal" required value={spot.longitude} onChange={(event) => setSpot({ ...spot, longitude: event.target.value })} />
						</Field>
						<Field label="How far you’ll travel, in km" error={errors.radiusKm}>
							<Input name="radiusKm" inputMode="numeric" required defaultValue={String(rate.radiusKm)} />
						</Field>
						<Field label="Note for advertisers" error={errors.note} hint="Optional. For example, the materials you use.">
							<Input name="note" maxLength={200} defaultValue={rate.note ?? ""} />
						</Field>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button type="submit" disabled={busy}>
							{busy ? <Spinner /> : <Save className="h-4 w-4" aria-hidden />}
							Save
						</Button>
						<Button variant="secondary" onClick={locate}>
							<LocateFixed className="h-4 w-4" aria-hidden />
							Use my location
						</Button>
					</div>
				</Form>

				<section className="space-y-3">
					<h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900">Quotes and requests</h2>
					{offers.length ? (
						<ul className="divide-y divide-surface-200 rounded-2xl bg-surface-100">
							{offers.map((offer) => (
								<li key={offer.id}>
									<Link prefetch="intent" to={offer.job ? `/jobs/${offer.job.id}` : "/jobs"} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-white/60">
										<span className="min-w-0">
											<span className="block font-semibold text-ink-900">{offer.job?.boardName ?? "A job"}</span>
											<span className="block text-xs text-ink-500">{offer.job ? `Up by ${formatDay(offer.job.dueOn)}` : ""}</span>
										</span>
										<span className="text-right">
											<span className="block font-semibold tabular-nums text-ink-900">{formatMoney(offer.amountMinor, offer.currency)}</span>
											<span className="block text-xs text-ink-500">{OFFER_LABELS[offer.status]}</span>
										</span>
									</Link>
								</li>
							))}
						</ul>
					) : (
						<p className="rounded-2xl bg-surface-100 px-4 py-3 text-sm text-ink-500">No quotes yet. Send one on any job near you, or wait for an advertiser to reach out.</p>
					)}
					{meta && <Pager meta={meta} noun="prices" />}
				</section>
			</div>
		</main>
	);
}
