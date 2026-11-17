import { useState } from "react";
import { Form, Link, useNavigation } from "react-router";
import { Gavel } from "lucide-react";
import type { AdminDispute, DisputeDecision } from "@greyboards/types";
import { AdminHeader } from "~/components/admin/AdminHeader";
import { BookingStatusBadge, formatDays, formatMoney } from "~/components/bookings/BookingBits";
import { DisputeSummary } from "~/components/disputes/DisputeBits";
import { Pager } from "~/components/Pager";
import { Alert, Button, Field, Input, Select, Spinner, Textarea } from "~/components/ui";
import { requireAdmin } from "~/lib/admin.server";
import { formError } from "~/lib/api.server";
import { useToastMessage } from "~/lib/toast";
import type { Route } from "./+types/disputes";

export const meta = () => [{ title: "Disputes · Admin · Greyboards" }];

const DECISIONS: { value: DisputeDecision; label: string; escrow: boolean }[] = [
	{ value: "refund_full", label: "Cancel and refund in full", escrow: true },
	{ value: "refund_part", label: "Cancel and refund part", escrow: true },
	{ value: "release", label: "Pay the board’s side", escrow: true },
	{ value: "dismiss", label: "Close without a change", escrow: false },
];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireAdmin(request, context, "disputes.resolve");
	const params = new URL(request.url).searchParams;
	const status = params.get("status") === "resolved" ? "resolved" : "open";
	const result = await api.admin.disputes({ status, page: Number(params.get("page")) || 1 });

	return { disputes: result.data, meta: result.meta, status };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireAdmin(request, context, "disputes.resolve");
	const form = await request.formData();
	const refund = Number(form.get("refund"));

	try {
		await api.admin.resolveDispute(String(form.get("id")), {
			decision: String(form.get("decision")) as DisputeDecision,
			resolution: String(form.get("resolution") ?? ""),
			...(refund > 0 ? { refund } : {}),
		});

		return { error: null, message: "Dispute decided. Everyone on the booking can see why." };
	} catch (error) {
		return { error: formError(error).error, message: null };
	}
}

/** Disputes about bookings, longest waiting first, with what staff can decide for each. */
export default function AdminDisputes({ loaderData, actionData }: Route.ComponentProps) {
	useToastMessage(actionData);

	const { disputes, meta, status } = loaderData;

	return (
		<>
			<AdminHeader title="Disputes" description="Problems raised on bookings. While money is still in escrow, a decision can refund it or pay the board’s side; every decision is recorded in the booking’s ledger and posted to its messages." />
			<div className="space-y-6 px-4 py-8 sm:px-8">
				<div className="flex gap-2" role="tablist">
					{(["open", "resolved"] as const).map((tab) => (
						<Link key={tab} to={tab === "open" ? "/admin/disputes" : "/admin/disputes?status=resolved"} role="tab" aria-selected={status === tab} className={`rounded-full px-4 py-2 text-sm font-semibold ${status === tab ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-surface-100"}`}>
							{tab === "open" ? "Waiting" : "Decided"}
						</Link>
					))}
				</div>
				{actionData?.error && <Alert>{actionData.error}</Alert>}

				{disputes.length ? (
					<div className="grid gap-4 lg:grid-cols-2">
						{disputes.map((dispute) => (
							<DisputeCard key={dispute.id} dispute={dispute} />
						))}
					</div>
				) : (
					<p className="panel px-5 py-10 text-center text-sm text-ink-500">{status === "open" ? "No disputes waiting." : "No decided disputes yet."}</p>
				)}

				<Pager meta={meta} noun="disputes" />
			</div>
		</>
	);
}

function DisputeCard({ dispute }: { dispute: AdminDispute }) {
	const navigation = useNavigation();
	const busy = navigation.formData?.get("id") === dispute.id;
	const booking = dispute.booking;
	const choices = DECISIONS.filter((choice) => !choice.escrow || booking?.inEscrow);
	const [decision, setDecision] = useState<DisputeDecision>(choices[0]!.value);

	return (
		<article className="panel space-y-4 p-5">
			{booking && (
				<div className="flex flex-wrap items-start justify-between gap-2">
					<div>
						<Link to={`/bookings/${booking.id}`} className="font-semibold text-brand-700 hover:underline">
							{booking.board?.name ?? "Booking"}
						</Link>
						<p className="text-sm text-ink-500 tabular-nums">
							{formatDays(booking)} · {formatMoney(booking.amountMinor, booking.currency)}
							{booking.inEscrow ? " in escrow" : ""}
						</p>
					</div>
					<BookingStatusBadge status={booking.status} />
				</div>
			)}
			<DisputeSummary dispute={dispute} currency={booking?.currency ?? "NGN"} />
			{dispute.status === "open" && (
				<Form method="post" preventScrollReset className="space-y-3 border-t border-surface-200 pt-4">
					<input type="hidden" name="id" value={dispute.id} />
					<Field label="Decision">
						<Select name="decision" value={decision} onChange={(event) => setDecision(event.target.value as DisputeDecision)}>
							{choices.map((choice) => (
								<option key={choice.value} value={choice.value}>
									{choice.label}
								</option>
							))}
						</Select>
					</Field>
					{decision === "refund_part" && booking && (
						<Field label="Refund" hint={`Of ${formatMoney(booking.amountMinor, booking.currency)}. The rest is shared by the booking’s split.`}>
							<Input name="refund" type="number" min="1" max={booking.amountMinor / 100 - 1} step="1" required />
						</Field>
					)}
					<Field label="Why" hint="Everyone on the booking sees this.">
						<Textarea name="resolution" rows={2} minLength={5} maxLength={1000} required />
					</Field>
					{!booking?.inEscrow && <p className="text-xs text-ink-500">The money has left escrow, so this can only be closed. Settle anything owed outside the app.</p>}
					<Button type="submit" disabled={busy}>
						{busy ? <Spinner /> : <Gavel className="h-4 w-4" aria-hidden />}
						Decide
					</Button>
				</Form>
			)}
		</article>
	);
}
