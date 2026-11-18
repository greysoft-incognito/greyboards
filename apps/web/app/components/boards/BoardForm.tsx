import { type FormEvent, useState } from "react";
import { Form, useNavigation } from "react-router";
import { Binoculars, Camera, HandCoins, LocateFixed, Presentation } from "lucide-react";
import type { BoardDetail, BoardKindDefinition, OwnerProfile } from "@greyboards/types";
import { ManagedOwnerSelect, OwnerPicker } from "./OwnerPicker";
import { NearbyBoards } from "./NearbyBoards";
import { PriceGuideBox, type GuideFields } from "./PriceGuideBox";
import { Alert, Button, Field, Input, Select, Spinner, Textarea } from "~/components/ui";
import { useLimits } from "~/lib/limits";

type Errors = Record<string, string>;

/** Coordinates as the form holds them, as text so a half-typed number stays put. */
interface Spot {
	latitude: string;
	longitude: string;
	accuracyM: string;
}

/**
 * The tag-a-board form, also used to edit one. The location comes from the browser while
 * standing at the board, or is typed in. New boards can carry their first photo.
 */
export function BoardForm({
	kinds,
	board,
	tagAs = [],
	error,
	fieldErrors = {},
	ownerProfiles = [],
	ownerPercents,
}: {
	kinds: BoardKindDefinition[];
	board?: BoardDetail;
	/** The roles the account can tag as. Empty when editing. */
	tagAs?: ("owner" | "scout")[];
	error?: string | null;
	fieldErrors?: Errors;
	/** The owner profiles the account manages, to tag a board under one of them. */
	ownerProfiles?: OwnerProfile[];
	/** The owner's percent of the rent on a board they tag and on one a scout tags, for the price preview. */
	ownerPercents?: { owner: number; scout: number };
}) {
	const navigation = useNavigation();
	const { maxImageMb } = useLimits();
	const busy = navigation.state === "submitting";
	const [as, setAs] = useState<"owner" | "scout">(tagAs[0] ?? "owner");
	const [spot, setSpot] = useState<Spot>({
		latitude: board ? String(board.latitude) : "",
		longitude: board ? String(board.longitude) : "",
		accuracyM: "",
	});
	const [locating, setLocating] = useState(false);
	const [locateError, setLocateError] = useState<string | null>(null);
	const scouting = !board && as === "scout";
	const [kind, setKind] = useState(board?.kind ?? "billboard");
	const digital = kind === "digital";
	const [ownerNet, setOwnerNet] = useState(board?.ownerNet ?? false);
	const [rate, setRate] = useState(() => {
		const minor = board?.ownerNet && board.ownerRateMinor != null ? board.ownerRateMinor : board?.rate?.amountMinor;

		return minor ? String(minor / 100) : "";
	});
	const ownerPercent = board ? (board.ownerPercent ?? null) : (ownerPercents?.[as] ?? null);
	const [guideFields, setGuideFields] = useState<Omit<GuideFields, "latitude" | "longitude">>({
		kind: board?.kind ?? "billboard",
		widthM: board ? String(board.widthM) : "",
		heightM: board ? String(board.heightM) : "",
		ratePeriod: board?.rate?.period ?? "month",
		roadClass: board?.roadClass ?? "",
		dailyTraffic: board?.measuredTraffic ? String(board.measuredTraffic) : "",
	});
	// The guide is for the listed price; with the owner's amount fixed, the field takes the owner's part of it.
	const useGuide = (listedMinor: number) => {
		const minor = ownerNet && ownerPercent ? Math.floor((listedMinor * ownerPercent) / 100) : listedMinor;

		setRate(String(Math.round(minor / 100)));
	};
	const trackGuide = (event: FormEvent<HTMLFormElement>) => {
		const target = event.target as HTMLInputElement;

		if (target.name in guideFields) setGuideFields((current) => ({ ...current, [target.name]: target.value }));
	};

	const locate = () => {
		if (!("geolocation" in navigator)) return setLocateError("This browser can't tell where you are. Type the coordinates instead.");

		setLocating(true);
		setLocateError(null);

		navigator.geolocation.getCurrentPosition(
			(position) => {
				setLocating(false);
				setSpot({
					latitude: position.coords.latitude.toFixed(6),
					longitude: position.coords.longitude.toFixed(6),
					accuracyM: String(Math.round(position.coords.accuracy)),
				});
			},
			(failure) => {
				setLocating(false);
				setLocateError(failure.code === failure.PERMISSION_DENIED ? "Allow location access, or enter the coordinates yourself." : "We couldn't find your location. Try again outside, or enter it yourself.");
			},
			{ enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
		);
	};

	return (
		<Form method="post" encType="multipart/form-data" className="space-y-6" onChange={trackGuide}>
			{error && <Alert>{error}</Alert>}

			{tagAs.length > 1 && (
				<fieldset className="panel p-5">
					<legend className="sr-only">Tagging as</legend>
					<p className="mb-3 text-sm font-semibold text-ink-900">Whose board is it?</p>
					<div className="grid gap-3 sm:grid-cols-2">
						{(
							[
								{ value: "owner", label: "It's my board", hint: "You own it and set its rate.", icon: Presentation },
								{ value: "scout", label: "I found it", hint: "You found it. We'll text the owner.", icon: Binoculars },
							] as const
						).map((option) => (
							<label key={option.value} className={`flex cursor-pointer gap-3 rounded-2xl border-[1.5px] p-4 transition ${as === option.value ? "border-brand-500 bg-brand-50" : "border-surface-200 hover:border-surface-300"}`}>
								<input type="radio" name="as" value={option.value} checked={as === option.value} onChange={() => setAs(option.value)} className="sr-only" />
								<option.icon className={`h-5 w-5 shrink-0 ${as === option.value ? "text-brand-600" : "text-ink-500"}`} aria-hidden />
								<span>
									<span className="block text-sm font-semibold text-ink-900">{option.label}</span>
									<span className="block text-sm text-ink-500">{option.hint}</span>
								</span>
							</label>
						))}
					</div>
				</fieldset>
			)}
			{tagAs.length === 1 && <input type="hidden" name="as" value={tagAs[0]} />}

			<section className="panel space-y-5 p-5 sm:p-6">
				<h2 className="font-display text-lg font-extrabold tracking-tight text-ink-900">Where it is</h2>
				<div className="flex flex-wrap items-center gap-3">
					<Button variant="secondary" onClick={locate} disabled={locating}>
						{locating ? <Spinner /> : <LocateFixed className="h-4 w-4" aria-hidden />}
						{locating ? "Finding your location…" : "Use my location"}
					</Button>
					<p className="text-sm text-ink-500">{spot.accuracyM ? `Accurate to about ${spot.accuracyM} m.` : "Stand right by the board for the best accuracy."}</p>
				</div>
				{locateError && <p className="text-sm text-red-700">{locateError}</p>}
				<div className="grid gap-4 sm:grid-cols-2">
					<Field label="Latitude" error={fieldErrors.latitude}>
						<Input name="latitude" inputMode="decimal" required value={spot.latitude} onChange={(event) => setSpot({ ...spot, latitude: event.target.value, accuracyM: "" })} placeholder="6.447400" />
					</Field>
					<Field label="Longitude" error={fieldErrors.longitude}>
						<Input name="longitude" inputMode="decimal" required value={spot.longitude} onChange={(event) => setSpot({ ...spot, longitude: event.target.value, accuracyM: "" })} placeholder="3.472400" />
					</Field>
				</div>
				<input type="hidden" name="accuracyM" value={spot.accuracyM} />
				{!board && <NearbyBoards latitude={spot.latitude} longitude={spot.longitude} />}
				<div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
					<Field label="Street address" error={fieldErrors.address}>
						<Input name="address" defaultValue={board?.address ?? ""} maxLength={191} placeholder="Admiralty Way, by the roundabout" />
					</Field>
					<Field label="City" error={fieldErrors.city}>
						<Input name="city" defaultValue={board?.city ?? ""} maxLength={80} placeholder="Kaduna" />
					</Field>
				</div>
				<input type="hidden" name="country" value={board?.country ?? "NG"} />
			</section>

			<section className="panel space-y-5 p-5 sm:p-6">
				<h2 className="font-display text-lg font-extrabold tracking-tight text-ink-900">The board</h2>
				<Field label="Name" error={fieldErrors.name} hint="Name it after a landmark so advertisers can picture it.">
					<Input name="name" required defaultValue={board?.name ?? ""} maxLength={120} placeholder="Ahmadu Bello Way, facing Murtala Square" />
				</Field>
				<div className="grid gap-4 sm:grid-cols-3">
					<Field label="Kind" error={fieldErrors.kind}>
						<Select name="kind" required value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
							{kinds.map((kind) => (
								<option key={kind.kind} value={kind.kind}>
									{kind.label}
								</option>
							))}
						</Select>
					</Field>
					<Field label="Width (m)" error={fieldErrors.widthM}>
						<Input name="widthM" type="number" step="0.1" min="0.5" max="100" required defaultValue={board?.widthM ?? ""} placeholder="12" />
					</Field>
					<Field label="Height (m)" error={fieldErrors.heightM}>
						<Input name="heightM" type="number" step="0.1" min="0.5" max="100" required defaultValue={board?.heightM ?? ""} placeholder="4" />
					</Field>
				</div>
				<div className="grid gap-4 sm:grid-cols-3">
					<Field label="Faces" error={fieldErrors.faces}>
						<Select name="faces" defaultValue={String(board?.faces ?? 1)}>
							{[1, 2, 3, 4].map((faces) => (
								<option key={faces} value={faces}>
									{faces === 1 ? "One face" : `${faces} faces`}
								</option>
							))}
						</Select>
					</Field>
					<Field label="Facing" error={fieldErrors.facing} hint="Which way traffic sees it.">
						<Input name="facing" defaultValue={board?.facing ?? ""} maxLength={60} placeholder="Traffic to Ajah" />
					</Field>
					<Field label="Lighting">
						<Select name="lit" defaultValue={board?.lit ? "1" : "0"}>
							<option value="0">Not lit</option>
							<option value="1">Lit at night</option>
						</Select>
					</Field>
				</div>
				<div className="grid gap-4 sm:grid-cols-2">
					<Field label="The road it faces" error={fieldErrors.roadClass} hint="Helps us estimate how many people see it.">
						<Select name="roadClass" defaultValue={board?.roadClass ?? ""}>
							<option value="">Not sure</option>
							<option value="expressway">Expressway or highway</option>
							<option value="major">Major road</option>
							<option value="street">Busy street</option>
							<option value="local">Quiet street</option>
						</Select>
					</Field>
					<Field label="People passing a day" error={fieldErrors.dailyTraffic} hint="Only if someone counted them.">
						<Input name="dailyTraffic" type="number" min="0" step="100" defaultValue={board?.measuredTraffic ?? ""} placeholder="25000" />
					</Field>
				</div>
				{digital && (
					<div className="grid gap-4 sm:grid-cols-2">
						<Field label="Slots in the loop" error={fieldErrors.loopSlots} hint="Leave empty for the standard loop.">
							<Input name="loopSlots" type="number" min="1" max="60" defaultValue={board?.ownLoopSlots ?? ""} placeholder={board?.loop ? String(board.loop.slots) : "6"} />
						</Field>
						<Field label="Seconds per slot" error={fieldErrors.slotSeconds} hint="Leave empty for the standard length.">
							<Input name="slotSeconds" type="number" min="5" max="120" defaultValue={board?.ownSlotSeconds ?? ""} placeholder={board?.loop ? String(board.loop.seconds) : "10"} />
						</Field>
					</div>
				)}
				<Field label="Notes" error={fieldErrors.description}>
					<Textarea name="description" rows={3} defaultValue={board?.description ?? ""} maxLength={1000} placeholder="Anything advertisers should know, like trees nearby or a busy junction." />
				</Field>
			</section>

			<section className="panel space-y-5 p-5 sm:p-6">
				<h2 className="font-display text-lg font-extrabold tracking-tight text-ink-900">{scouting ? "Owner and rate" : !board && ownerProfiles.length > 1 ? "Owner and rate" : "Rate"}</h2>
				<div className="grid gap-4 sm:grid-cols-2">
					<Field
						label={ownerNet ? (digital ? "What the owner gets per slot, in naira" : "What the owner gets, in naira") : digital ? "Rate per slot, all day, in naira" : "Rate in naira"}
						error={fieldErrors.rateMinor}
						hint={ownerNet ? "Each period, after every other share." : scouting ? "What the owner charges, if you know." : undefined}
					>
						<Input name="rate" type="number" min="0" step="1000" value={rate} onChange={(event) => setRate(event.target.value)} placeholder="850000" />
					</Field>
					<Field label="Per" error={fieldErrors.ratePeriod}>
						<Select name="ratePeriod" defaultValue={board?.rate?.period ?? "month"}>
							<option value="month">Month</option>
							<option value="week">Week</option>
						</Select>
					</Field>
				</div>
				<PriceGuideBox fields={{ ...guideFields, latitude: spot.latitude, longitude: spot.longitude }} exceptId={board?.id} onUse={useGuide} />
				<OwnerNetToggle on={ownerNet} onChange={setOwnerNet} rate={rate} percent={ownerPercent} />
				<div className="grid gap-4 sm:grid-cols-2">
					<Field label="Who prints and puts up the ads?" error={fieldErrors.printsOwn}>
						<Select name="printsOwn" defaultValue={board?.printsOwn ? "1" : "0"}>
							<option value="0">A Greyboards dispatcher</option>
							<option value="1">{scouting ? "The owner or I will" : "We'll do it"}</option>
						</Select>
					</Field>
					<Field label="Your print price in naira" error={fieldErrors.printFeeMinor} hint="Only if you print. Leave empty for the standard price.">
						<Input name="printFee" type="number" min="0" step="1000" defaultValue={board?.ownPrintFeeMinor ? board.ownPrintFeeMinor / 100 : ""} placeholder="150000" />
					</Field>
				</div>
				{scouting && <OwnerPicker errors={fieldErrors} />}
				{!board && as === "owner" && <ManagedOwnerSelect profiles={ownerProfiles} error={fieldErrors.ownerProfileId} />}
			</section>

			{!board && (
				<section className="panel space-y-3 p-5 sm:p-6">
					<h2 className="font-display text-lg font-extrabold tracking-tight text-ink-900">A photo</h2>
					<p className="text-sm text-ink-500">Take it from the road with the whole board in view.</p>
					<label className="flex cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-surface-300 px-4 py-4 text-sm text-ink-700 transition hover:border-brand-300 hover:bg-white">
						<Camera className="h-5 w-5 text-brand-600" aria-hidden />
						<input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/heic" capture="environment" className="min-w-0 flex-1 text-sm file:hidden" />
					</label>
					{fieldErrors.photo ? <p className="text-sm text-red-700">{fieldErrors.photo}</p> : <p className="text-xs text-ink-500">Up to {maxImageMb} MB.</p>}
				</section>
			)}

			<div className="flex justify-end">
				<Button type="submit" disabled={busy}>
					{busy && <Spinner />}
					{board ? "Save changes" : "Tag this board"}
				</Button>
			</div>
		</Form>
	);
}

const naira = (amount: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);

/**
 * Lets the tagger fix what the owner receives. The rate typed is then the owner's amount, and
 * the listed rate adds the other shares on top: the same rounding the API uses, up to a naira.
 */
function OwnerNetToggle({ on, onChange, rate, percent }: { on: boolean; onChange: (on: boolean) => void; rate: string; percent: number | null }) {
	const amount = Number(rate);
	const typed = rate.trim() !== "" && Number.isFinite(amount) && amount > 0;
	const grossing = percent !== null && percent > 0 && percent < 100;
	const listed = typed && grossing ? Math.ceil((amount * 100) / percent) : null;

	return (
		<div className="space-y-3 rounded-2xl border-[1.5px] border-surface-200 p-4">
			<label className="flex cursor-pointer items-start gap-3">
				<input type="hidden" name="ownerNet" value={on ? "1" : "0"} />
				<input type="checkbox" checked={on} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
				<span aria-hidden className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand-300 ${on ? "bg-brand-500" : "bg-surface-300"}`}>
					<span className={`h-5 w-5 rounded-full bg-white shadow transition ${on ? "translate-x-5" : ""}`} />
				</span>
				<span>
					<span className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
						<HandCoins className="h-4 w-4 text-brand-600" aria-hidden />
						Guarantee the owner this amount
					</span>
					<span className="block text-sm text-ink-500">We'll add our fees on top, so the owner gets the full amount.</span>
				</span>
			</label>
			{typed && percent !== null && (
				<p className="rounded-xl bg-surface-100 px-3 py-2 text-sm text-ink-700">
					{on && listed !== null ? (
						<>
							Listed at <strong className="text-ink-900">{naira(listed)}</strong>. The owner gets {naira(amount)}, which is {percent}% of the rent.
						</>
					) : (
						<>
							Listed at <strong className="text-ink-900">{naira(amount)}</strong>. The owner gets {naira(Math.floor((amount * percent) / 100))}, which is {percent}% of the rent.
						</>
					)}
				</p>
			)}
		</div>
	);
}
