import { useState } from "react";
import { Form, Link, useNavigation } from "react-router";
import { CalendarCheck, CalendarX2, ShieldCheck } from "lucide-react";
import type { BookedDays, BoardDetail } from "@greyboards/types";
import { formatRate } from "~/components/boards/BoardBits";
import { Alert, Button, buttonClass, Input, Select, Spinner } from "~/components/ui";
import { formatDays, formatMoney } from "./BookingBits";

/**
 * Picks the first day and how many weeks or months to book, shows the total, and sends the
 * advertiser on to pay. Days other bookings take are listed so they can pick around them.
 */
export function BookPanel({ board, taken, canBook, error }: { board: BoardDetail; taken: BookedDays[]; canBook: boolean; error?: string | null }) {
	const navigation = useNavigation();
	const busy = navigation.formData?.get("intent") === "book";
	const [periods, setPeriods] = useState(1);
	const terms = board.booking;
	const rate = board.rate;

	if (!terms.open || !rate) {
		return (
			<div className="panel flex items-start gap-3 p-5 text-sm text-ink-700">
				<CalendarX2 className="h-5 w-5 shrink-0 text-ink-500" aria-hidden />
				{terms.reason ?? "This board isn't taking bookings yet."}
			</div>
		);
	}

	const unit = rate.period;

	return (
		<div className="panel space-y-4 p-5 sm:p-6">
			<div>
				<h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900">Book this board</h2>
				<p className="mt-1 text-sm text-ink-500">Priced by the {unit}. Pick your first day and how long to run.</p>
			</div>

			{canBook ? (
				<Form method="post" className="space-y-4">
					<input type="hidden" name="intent" value="book" />
					<div className="grid grid-cols-2 gap-3">
						<label className="text-sm font-semibold text-ink-700">
							First day
							<Input type="date" name="startsOn" required min={terms.earliestStart} defaultValue={terms.earliestStart} className="mt-1" />
						</label>
						<label className="text-sm font-semibold text-ink-700">
							How long
							<Select name="periods" value={periods} onChange={(event) => setPeriods(Number(event.target.value))} className="mt-1">
								{Array.from({ length: terms.maxPeriods }, (_, index) => index + 1).map((count) => (
									<option key={count} value={count}>
										{count} {unit}
										{count === 1 ? "" : "s"}
									</option>
								))}
							</Select>
						</label>
					</div>
					<dl className="space-y-1.5 rounded-2xl bg-surface-100 px-4 py-3 text-sm">
						<div className="flex justify-between gap-4">
							<dt className="text-ink-700">
								{formatRate(rate)} × {periods}
							</dt>
							<dd className="text-ink-900 tabular-nums">{formatMoney(rate.amountMinor * periods, rate.currency)}</dd>
						</div>
						{terms.printFeeMinor > 0 && (
							<div className="flex justify-between gap-4">
								<dt className="text-ink-700">Printing and posting</dt>
								<dd className="text-ink-900 tabular-nums">{formatMoney(terms.printFeeMinor, rate.currency)}</dd>
							</div>
						)}
						<div className="flex items-baseline justify-between gap-4 border-t border-surface-200 pt-1.5">
							<dt className="font-semibold text-ink-900">Total</dt>
							<dd className="font-display text-xl font-extrabold text-ink-900 tabular-nums">{formatMoney(rate.amountMinor * periods + terms.printFeeMinor, rate.currency)}</dd>
						</div>
					</dl>
					{error && <Alert>{error}</Alert>}
					<Button type="submit" className="w-full" disabled={busy}>
						{busy ? <Spinner /> : <CalendarCheck className="h-4 w-4" aria-hidden />}
						{busy ? "Holding your dates" : "Hold dates and pay"}
					</Button>
					<p className="flex items-start gap-2 text-xs text-ink-500">
						<ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-available" aria-hidden />
						We hold your payment until there's a photo of your ad on the board. Your dates are held for a few minutes while you pay.
					</p>
				</Form>
			) : (
				<Link prefetch="intent" to="/settings/roles" className={buttonClass("primary", "w-full")}>
					Add the advertiser role to book
				</Link>
			)}

			{taken.length > 0 && (
				<div className="border-t border-surface-200 pt-4">
					<p className="text-sm font-semibold text-ink-700">Already booked</p>
					<ul className="mt-2 space-y-1 text-sm text-ink-500">
						{taken.slice(0, 6).map((days) => (
							<li key={days.startsOn}>{formatDays(days)}</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
