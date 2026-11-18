import { useState } from "react";
import { Form, Link, useNavigation } from "react-router";
import { CalendarCheck, CalendarX2, HandCoins, MonitorPlay, ShieldCheck } from "lucide-react";
import type { BookedDays, BoardDetail, Daypart, SlotQuote } from "@greyboards/types";
import { formatHeading, formatRate } from "~/components/boards/BoardBits";
import { Alert, Button, buttonClass, Field, Input, Select, Spinner, Textarea } from "~/components/ui";
import { formatDays, formatMoney } from "./BookingBits";

export const DAYPART_LABELS: Record<Daypart, string> = { all_day: "All day", morning: "Morning, 6 AM to noon", afternoon: "Afternoon, noon to 6 PM", evening: "Evening, 6 PM to midnight" };

/**
 * Picks the first day and how many weeks or months to book, shows the total, and sends the
 * advertiser on to pay. Days other bookings take are listed so they can pick around them.
 * On a digital screen it also picks how many slots of the loop, and for which part of the day.
 */
export function BookPanel({
	board,
	taken,
	canBook,
	error,
	slotQuote = null,
}: {
	board: BoardDetail;
	taken: Record<string, BookedDays[]>;
	canBook: boolean;
	error?: string | null;
	/** On a digital screen: its loop and what part of the day costs a slot. */
	slotQuote?: SlotQuote | null;
}) {
	const navigation = useNavigation();
	const intent = navigation.formData?.get("intent");
	const busy = intent === "book" || intent === "offer";
	const [offering, setOffering] = useState(false);
	const [shares, setShares] = useState(1);
	const digital = !!slotQuote;
	const [slots, setSlots] = useState(1);
	const [daypart, setDaypart] = useState<Daypart>("all_day");
	const splitting = shares > 1 && !offering && !digital;
	const [faceId, setFaceId] = useState(board.rateCard[0]?.id ?? "");
	const face = board.rateCard.find((candidate) => candidate.id === faceId) ?? board.rateCard[0];
	const minPeriods = Math.min(face?.minPeriods ?? 1, board.booking.maxPeriods);
	const [periods, setPeriods] = useState(minPeriods);
	const terms = board.booking;
	const rate = board.rate && face?.rateMinor !== null && face?.rateMinor !== undefined ? { ...board.rate, amountMinor: face.rateMinor } : board.rate;
	const days = taken[face?.id ?? ""] ?? [];
	const lengths = Array.from({ length: terms.maxPeriods - minPeriods + 1 }, (_, index) => minPeriods + index);

	const pickFace = (id: string) => {
		const next = board.rateCard.find((candidate) => candidate.id === id);

		setFaceId(id);
		setPeriods((current) => Math.max(current, Math.min(next?.minPeriods ?? 1, terms.maxPeriods)));
	};

	if (!terms.open || !rate) {
		return (
			<div className="panel flex items-start gap-3 p-5 text-sm text-ink-700">
				<CalendarX2 className="h-5 w-5 shrink-0 text-ink-500" aria-hidden />
				{terms.reason ?? "This board isn't taking bookings yet."}
			</div>
		);
	}

	const unit = rate.period;
	const percent = slotQuote?.dayparts.find((part) => part.daypart === daypart)?.percent ?? 100;
	// On a screen the rate is for one slot all day; the price is for the slots and part of the day picked.
	const perPeriod = digital ? Math.round((rate.amountMinor * slots * percent) / 100) : rate.amountMinor;
	const runPrice = perPeriod * periods;

	return (
		<div className="panel space-y-4 p-5 sm:p-6">
			<div>
				<h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900">Book this board</h2>
				<p className="mt-1 text-sm text-ink-500">
					{digital
						? `Priced per slot by the ${unit}. The loop has ${slotQuote.loop.slots} slots of ${slotQuote.loop.seconds} seconds.`
						: `Priced by the ${unit}. Pick your first day and how long to run.`}
				</p>
			</div>

			{canBook ? (
				<Form method="post" className="space-y-4">
					<input type="hidden" name="intent" value={offering ? "offer" : "book"} />
					{face && <input type="hidden" name="faceId" value={face.id} />}
					{board.rateCard.length > 1 && (
						<fieldset>
							<legend className="text-sm font-semibold text-ink-700">Which face</legend>
							<div className="mt-1 grid gap-2 sm:grid-cols-2">
								{board.rateCard.map((option) => (
									<button
										key={option.id}
										type="button"
										onClick={() => pickFace(option.id)}
										aria-pressed={option.id === face?.id}
										className={`rounded-2xl border-[1.5px] px-3 py-2.5 text-left text-sm transition ${option.id === face?.id ? "border-brand-500 bg-brand-50 text-ink-900" : "border-surface-200 text-ink-700 hover:border-surface-300"}`}
									>
										<span className="block font-semibold">{option.label}</span>
										<span className="block text-ink-500 tabular-nums">
											{option.rateMinor !== null && board.rate ? formatRate({ ...board.rate, amountMinor: option.rateMinor }) : "No price yet"}
											{option.headingDeg !== null ? ` · ${formatHeading(option.headingDeg)}` : ""}
										</span>
									</button>
								))}
							</div>
						</fieldset>
					)}
					<div className="grid grid-cols-2 gap-3">
						<label className="text-sm font-semibold text-ink-700">
							First day
							<Input
								key={splitting ? "shared" : "solo"}
								type="date"
								name="startsOn"
								required
								min={splitting ? terms.shares.earliestStart : terms.earliestStart}
								defaultValue={splitting ? terms.shares.earliestStart : terms.earliestStart}
								className="mt-1"
							/>
						</label>
						<label className="text-sm font-semibold text-ink-700">
							How long
							<Select name="periods" value={periods} onChange={(event) => setPeriods(Number(event.target.value))} className="mt-1">
								{lengths.map((count) => (
									<option key={count} value={count}>
										{count} {unit}
										{count === 1 ? "" : "s"}
									</option>
								))}
							</Select>
						</label>
					</div>
					{digital && (
						<div className="grid grid-cols-2 gap-3">
							<input type="hidden" name="slots" value={slots} />
							<input type="hidden" name="daypart" value={daypart} />
							<label className="text-sm font-semibold text-ink-700">
								Slots in the loop
								<Select value={slots} onChange={(event) => setSlots(Number(event.target.value))} className="mt-1">
									{Array.from({ length: slotQuote.loop.slots }, (_, index) => index + 1).map((count) => (
										<option key={count} value={count}>
											{count} of {slotQuote.loop.slots}
										</option>
									))}
								</Select>
							</label>
							<label className="text-sm font-semibold text-ink-700">
								When it plays
								<Select value={daypart} onChange={(event) => setDaypart(event.target.value as Daypart)} className="mt-1">
									{slotQuote.dayparts.map((part) => (
										<option key={part.daypart} value={part.daypart}>
											{DAYPART_LABELS[part.daypart]}
										</option>
									))}
								</Select>
							</label>
							<p className="col-span-2 flex items-center gap-2 text-xs text-ink-500">
								<MonitorPlay className="h-4 w-4 shrink-0" aria-hidden />
								Your ad plays for {slots * slotQuote.loop.seconds} seconds in every {slotQuote.loop.slots * slotQuote.loop.seconds}-second loop.
							</p>
						</div>
					)}
					{terms.shares.enabled && !offering && !digital && (
						<label className="block text-sm font-semibold text-ink-700">
							Share the board
							<Select name="shares" value={shares} onChange={(event) => setShares(Number(event.target.value))} className="mt-1">
								<option value={1}>No, just my ad</option>
								{Array.from({ length: terms.shares.max - 1 }, (_, index) => index + 2).map((count) => (
									<option key={count} value={count}>
										With {count} advertisers in all
									</option>
								))}
							</Select>
						</label>
					)}
					<dl className="space-y-1.5 rounded-2xl bg-surface-100 px-4 py-3 text-sm">
						<div className="flex justify-between gap-4">
							<dt className="text-ink-700">
								{formatRate({ ...rate, amountMinor: perPeriod })} × {periods}
							</dt>
							<dd className="text-ink-900 tabular-nums">{formatMoney(runPrice, rate.currency)}</dd>
						</div>
						{terms.printFeeMinor > 0 ? (
							<div className="flex justify-between gap-4">
								<dt className="text-ink-700">Printing and posting by the owner</dt>
								<dd className="text-ink-900 tabular-nums">{formatMoney(terms.printFeeMinor, rate.currency)}</dd>
							</div>
						) : (
							board.kind !== "digital" && (
								<div className="flex justify-between gap-4">
									<dt className="text-ink-700">Printing and posting</dt>
									<dd className="text-right text-ink-500">Priced by dispatchers once your artwork is approved</dd>
								</div>
							)
						)}
						{splitting && (
							<div className="flex justify-between gap-4">
								<dt className="text-ink-700">Each share, about</dt>
								<dd className="text-ink-900 tabular-nums">{formatMoney(Math.floor((runPrice + terms.printFeeMinor) / shares), rate.currency)}</dd>
							</div>
						)}
						<div className="flex items-baseline justify-between gap-4 border-t border-surface-200 pt-1.5">
							<dt className="font-semibold text-ink-900">Total</dt>
							<dd className="font-display text-xl font-extrabold text-ink-900 tabular-nums">{formatMoney(runPrice + terms.printFeeMinor, rate.currency)}</dd>
						</div>
					</dl>
					{offering && (
						<div className="space-y-3 rounded-2xl border-[1.5px] border-brand-200 p-4">
							<Field label="Your offer for the run" hint={`Listed at ${formatMoney(rate.amountMinor * periods, rate.currency)} before printing`}>
								<Input name="amount" type="number" min="1" max={(rate.amountMinor * periods) / 100 - 1} step="1000" defaultValue={Math.floor((rate.amountMinor * periods * 0.9) / 100000) * 1000} required />
							</Field>
							<Field label="Note for the owner">
								<Textarea name="note" rows={2} maxLength={500} placeholder="Such as: a three-month campaign if this goes well" />
							</Field>
						</div>
					)}
					{error && <Alert>{error}</Alert>}
					<Button type="submit" className="w-full" disabled={busy}>
						{busy ? <Spinner /> : offering ? <HandCoins className="h-4 w-4" aria-hidden /> : <CalendarCheck className="h-4 w-4" aria-hidden />}
						{offering ? (busy ? "Sending your offer" : "Send offer") : busy ? "Holding your dates" : splitting ? "Hold dates and invite the others" : "Hold dates and pay"}
					</Button>
					{!digital && (
						<button type="button" onClick={() => setOffering((current) => !current)} className="w-full text-sm font-semibold text-brand-700 hover:underline">
							{offering ? "Book at the listed price instead" : "Make an offer instead"}
						</button>
					)}
					<p className="flex items-start gap-2 text-xs text-ink-500">
						<ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-available" aria-hidden />
						{offering
							? "The owner can accept, decline or counter. If they accept, the dates are held for you to pay."
							: splitting
								? `Each advertiser pays their share and sends their own design; the print merges them all. You get an invite link for each share, everyone has ${terms.shares.payHours} hours to pay, and you can cover any left unpaid.`
								: "We hold your payment until there's a photo of your ad on the board. Your dates are held for a few minutes while you pay."}
					</p>
				</Form>
			) : (
				<Link prefetch="intent" to="/settings/roles" className={buttonClass("primary", "w-full")}>
					Add the advertiser role to book
				</Link>
			)}

			{days.length > 0 && (
				<div className="border-t border-surface-200 pt-4">
					<p className="text-sm font-semibold text-ink-700">{board.rateCard.length > 1 && face ? `Not free on ${face.label}` : "Not free"}</p>
					<ul className="mt-2 space-y-1 text-sm text-ink-500">
						{days.slice(0, 6).map((run) => (
							<li key={`${run.startsOn}-${run.auction ? "bids" : run.blocked ? "kept" : "booked"}`}>
								{formatDays(run)} · {run.auction ? "open for bids" : run.blocked ? "kept by the owner" : digital ? "every slot booked" : "booked"}
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
