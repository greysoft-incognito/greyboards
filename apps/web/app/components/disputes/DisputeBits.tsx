import { useState } from "react";
import { Form, useNavigation } from "react-router";
import { ShieldAlert } from "lucide-react";
import type { BookingDisputes, Dispute, DisputeReason } from "@greyboards/types";
import { formatMoney } from "~/components/bookings/BookingBits";
import { formatMoment } from "~/components/bids/BidBits";
import { Button, Select, Spinner, Textarea } from "~/components/ui";

export const DISPUTE_REASONS: { value: DisputeReason; label: string }[] = [
	{ value: "not_up", label: "The ad isn’t up" },
	{ value: "wrong_ad", label: "The wrong ad is up" },
	{ value: "damaged", label: "The ad or board is damaged" },
	{ value: "taken_down", label: "The ad came down early" },
	{ value: "payment", label: "A problem with the money" },
	{ value: "other", label: "Something else" },
];

export const DISPUTE_SIDES = { advertiser: "Advertiser", board: "Board’s side", dispatch: "Dispatch" } as const;

/** What was raised and, once decided, what staff decided and why. */
export function DisputeSummary({ dispute, currency }: { dispute: Dispute; currency: string }) {
	return (
		<div className="space-y-2 text-sm">
			<p className="flex flex-wrap items-center gap-2">
				<span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${dispute.status === "open" ? "bg-amber-100 text-amber-800" : "bg-surface-100 text-ink-700"}`}>{dispute.status === "open" ? "Waiting for staff" : "Decided"}</span>
				<span className="font-semibold text-ink-900">{dispute.reasonLabel}</span>
			</p>
			<p className="whitespace-pre-line text-ink-700">{dispute.details}</p>
			<p className="text-xs text-ink-500">
				Raised by {dispute.openedBy ?? "someone"} ({DISPUTE_SIDES[dispute.side]}) · {formatMoment(dispute.createdAt)}
			</p>
			{dispute.status === "resolved" && (
				<div className="rounded-2xl bg-surface-100 px-4 py-3">
					<p className="font-semibold text-ink-900">
						{dispute.decisionLabel}
						{dispute.refundMinor ? ` · ${formatMoney(dispute.refundMinor, currency)} back` : ""}
					</p>
					{dispute.resolution && <p className="mt-1 whitespace-pre-line text-ink-700">{dispute.resolution}</p>}
					{dispute.resolvedAt && <p className="mt-1 text-xs text-ink-500">{formatMoment(dispute.resolvedAt)}</p>}
				</div>
			)}
		</div>
	);
}

/** On the booking's page: the latest dispute, and a form to raise one when something went wrong. */
export function DisputePanel({ disputes, currency }: { disputes: BookingDisputes; currency: string }) {
	const navigation = useNavigation();
	const busy = navigation.formData?.get("intent") === "dispute";
	const [raising, setRaising] = useState(false);
	const { latest, canOpen } = disputes;

	if (!latest && !canOpen) return null;

	return (
		<div className="panel space-y-3 p-5 sm:p-6">
			<h2 className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-ink-900">
				<ShieldAlert className="h-5 w-5 text-brand-700" aria-hidden />
				{latest?.status === "open" ? "Dispute" : "Something wrong?"}
			</h2>
			{latest && <DisputeSummary dispute={latest} currency={currency} />}
			{latest?.status === "open" && <p className="text-xs text-ink-500">Staff aim to decide within {disputes.answerHours} hours. Any money still held stays held until then.</p>}
			{canOpen &&
				(raising ? (
					<Form method="post" preventScrollReset className="space-y-3" onSubmit={() => setRaising(false)}>
						<input type="hidden" name="intent" value="dispute" />
						<Select name="reason" required aria-label="What went wrong" defaultValue="">
							<option value="" disabled>
								What went wrong?
							</option>
							{DISPUTE_REASONS.map((reason) => (
								<option key={reason.value} value={reason.value}>
									{reason.label}
								</option>
							))}
						</Select>
						<Textarea name="details" rows={3} minLength={10} maxLength={1000} required placeholder="What happened, and when. Add photos in the messages below." aria-label="Details" />
						<div className="flex flex-wrap gap-2">
							<Button type="submit" disabled={busy}>
								{busy ? <Spinner /> : <ShieldAlert className="h-4 w-4" aria-hidden />}
								Raise dispute
							</Button>
							<Button type="button" variant="ghost" onClick={() => setRaising(false)}>
								Not now
							</Button>
						</div>
					</Form>
				) : (
					<div className="space-y-2">
						{!latest && <p className="text-sm text-ink-500">Try the messages first. If you can’t sort it out between you, staff will look into it and decide.</p>}
						<Button variant="secondary" onClick={() => setRaising(true)}>
							Raise a dispute
						</Button>
					</div>
				))}
		</div>
	);
}
