import { Form, useNavigation } from "react-router";
import { CalendarOff, Layers, Save, X } from "lucide-react";
import type { BoardDetail, BoardFace } from "@greyboards/types";
import { formatHeading } from "~/components/boards/BoardBits";
import { formatDays, formatMoney } from "~/components/bookings/BookingBits";
import { Button, Field, Input, Select, Spinner } from "~/components/ui";

/** Each face's name and rate card, for whoever looks after the board. An empty rate uses the board's. */
export function RateCard({ board }: { board: BoardDetail }) {
	const unit = board.rate?.period ?? "month";

	return (
		<div className="panel space-y-4 p-5 sm:p-6">
			<div>
				<h2 className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-ink-900">
					<Layers className="h-5 w-5 text-brand-600" aria-hidden />
					Faces and rates
				</h2>
				<p className="mt-1 text-sm text-ink-500">Each face is booked on its own. Leave a rate empty to use the board's.</p>
			</div>
			<ul className="space-y-3">
				{board.rateCard.map((face) => (
					<li key={face.id}>
						<FaceForm face={face} unit={unit} currency={board.currency} />
					</li>
				))}
			</ul>
		</div>
	);
}

function FaceForm({ face, unit, currency }: { face: BoardFace; unit: string; currency: string }) {
	const navigation = useNavigation();
	const busy = navigation.formData?.get("intent") === "save-face" && navigation.formData?.get("face") === face.id;

	return (
		<Form method="post" preventScrollReset className="rounded-2xl bg-surface-100 p-4">
			<input type="hidden" name="intent" value="save-face" />
			<input type="hidden" name="face" value={face.id} />
			<div className="grid gap-3 sm:grid-cols-[1.2fr_1fr_0.8fr]">
				<Field label="Name" hint={face.headingDeg !== null ? formatHeading(face.headingDeg) : undefined}>
					<Input name="label" defaultValue={face.label} maxLength={40} required />
				</Field>
				<Field label={`Rate per ${unit}`} hint={face.ownRateMinor === null && face.rateMinor !== null ? `Board's rate: ${formatMoney(face.rateMinor, currency)}` : undefined}>
					<Input name="rate" type="number" min="0" step="1000" defaultValue={face.ownRateMinor === null ? "" : face.ownRateMinor / 100} placeholder="Board's rate" />
				</Field>
				<Field label="Shortest booking">
					<Select name="minPeriods" defaultValue={face.minPeriods}>
						{Array.from({ length: 12 }, (_, index) => index + 1).map((count) => (
							<option key={count} value={count}>
								{count} {unit}
								{count === 1 ? "" : "s"}
							</option>
						))}
					</Select>
				</Field>
			</div>
			<Button type="submit" variant="secondary" className="mt-3" disabled={busy}>
				{busy ? <Spinner /> : <Save className="h-4 w-4" aria-hidden />}
				Save {face.label}
			</Button>
		</Form>
	);
}

/** Days the owner keeps for their own clients, on one face or the whole board. */
export function BlockedDays({ board, today }: { board: BoardDetail; today: string }) {
	const navigation = useNavigation();
	const busy = navigation.formData?.get("intent") === "block";
	const blocks = board.blocks ?? [];
	const faceLabel = (faceId: string | null) => (faceId ? (board.rateCard.find((face) => face.id === faceId)?.label ?? "One face") : "Whole board");

	return (
		<div className="panel space-y-4 p-5 sm:p-6">
			<div>
				<h2 className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-ink-900">
					<CalendarOff className="h-5 w-5 text-brand-600" aria-hidden />
					Blocked days
				</h2>
				<p className="mt-1 text-sm text-ink-500">Keep days for your own clients. Advertisers can't book them.</p>
			</div>

			{blocks.length > 0 && (
				<ul className="divide-y divide-surface-200 rounded-2xl bg-surface-100">
					{blocks.map((block) => (
						<li key={block.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
							<span>
								<span className="font-semibold text-ink-900">{formatDays(block)}</span>
								<span className="block text-ink-500">{[faceLabel(block.faceId), block.note].filter(Boolean).join(" · ")}</span>
							</span>
							<Form method="post" preventScrollReset>
								<input type="hidden" name="intent" value="unblock" />
								<input type="hidden" name="block" value={block.id} />
								<button type="submit" className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-white hover:text-ink-900" aria-label="Open these days again">
									<X className="h-4 w-4" aria-hidden />
								</button>
							</Form>
						</li>
					))}
				</ul>
			)}

			<Form method="post" preventScrollReset className="space-y-3">
				<input type="hidden" name="intent" value="block" />
				<div className="grid grid-cols-2 gap-3">
					<Field label="First day">
						<Input type="date" name="startsOn" min={today} required />
					</Field>
					<Field label="Last day">
						<Input type="date" name="endsOn" min={today} required />
					</Field>
				</div>
				<div className="grid gap-3 sm:grid-cols-2">
					{board.rateCard.length > 1 && (
						<Field label="Which face">
							<Select name="faceId" defaultValue="">
								<option value="">Whole board</option>
								{board.rateCard.map((face) => (
									<option key={face.id} value={face.id}>
										{face.label}
									</option>
								))}
							</Select>
						</Field>
					)}
					<Field label="Note for yourself">
						<Input name="note" maxLength={191} placeholder="Such as: our own client" />
					</Field>
				</div>
				<Button type="submit" variant="secondary" disabled={busy}>
					{busy ? <Spinner /> : <CalendarOff className="h-4 w-4" aria-hidden />}
					Block these days
				</Button>
			</Form>
		</div>
	);
}
