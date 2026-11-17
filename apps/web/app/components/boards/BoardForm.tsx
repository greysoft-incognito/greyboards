import { useState } from "react";
import { Form, useNavigation } from "react-router";
import { Binoculars, Camera, LocateFixed, Presentation } from "lucide-react";
import type { BoardDetail, BoardKindDefinition, OwnerProfile } from "@greyboards/types";
import { ManagedOwnerSelect, OwnerPicker } from "./OwnerPicker";
import { NearbyBoards } from "./NearbyBoards";
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
}: {
	kinds: BoardKindDefinition[];
	board?: BoardDetail;
	/** The roles the account can tag as. Empty when editing. */
	tagAs?: ("owner" | "scout")[];
	error?: string | null;
	fieldErrors?: Errors;
	/** The owner profiles the account manages, to tag a board under one of them. */
	ownerProfiles?: OwnerProfile[];
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
				setLocateError(failure.code === failure.PERMISSION_DENIED ? "Allow location for this site, or type the coordinates." : "We couldn't get your location. Try again outside, or type it.");
			},
			{ enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
		);
	};

	return (
		<Form method="post" encType="multipart/form-data" className="space-y-6">
			{error && <Alert>{error}</Alert>}

			{tagAs.length > 1 && (
				<fieldset className="panel p-5">
					<legend className="sr-only">You are tagging as</legend>
					<p className="mb-3 text-sm font-semibold text-ink-900">Whose board is it?</p>
					<div className="grid gap-3 sm:grid-cols-2">
						{(
							[
								{ value: "owner", label: "It's my board", hint: "You own it and set its rate.", icon: Presentation },
								{ value: "scout", label: "I found it", hint: "You scouted it. We'll text the owner.", icon: Binoculars },
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
						{locating ? "Finding you…" : "Use where I am"}
					</Button>
					<p className="text-sm text-ink-500">{spot.accuracyM ? `Accurate to about ${spot.accuracyM} m.` : "Stand by the board for the best fix."}</p>
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
						<Input name="city" defaultValue={board?.city ?? ""} maxLength={80} placeholder="Lagos" />
					</Field>
				</div>
				<input type="hidden" name="country" value={board?.country ?? "NG"} />
			</section>

			<section className="panel space-y-5 p-5 sm:p-6">
				<h2 className="font-display text-lg font-extrabold tracking-tight text-ink-900">The board</h2>
				<Field label="Name" error={fieldErrors.name} hint="What advertisers see first. A landmark helps.">
					<Input name="name" required defaultValue={board?.name ?? ""} maxLength={120} placeholder="Admiralty Way, facing Lekki Phase 1" />
				</Field>
				<div className="grid gap-4 sm:grid-cols-3">
					<Field label="Kind" error={fieldErrors.kind}>
						<Select name="kind" required defaultValue={board?.kind ?? "billboard"}>
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
					<Field label="Facing" error={fieldErrors.facing} hint="Which traffic sees it.">
						<Input name="facing" defaultValue={board?.facing ?? ""} maxLength={60} placeholder="Traffic to Ajah" />
					</Field>
					<Field label="Lighting">
						<Select name="lit" defaultValue={board?.lit ? "1" : "0"}>
							<option value="0">Not lit</option>
							<option value="1">Lit at night</option>
						</Select>
					</Field>
				</div>
				<Field label="Notes" error={fieldErrors.description}>
					<Textarea name="description" rows={3} defaultValue={board?.description ?? ""} maxLength={1000} placeholder="Anything an advertiser should know, such as trees in the way or a nearby junction." />
				</Field>
			</section>

			<section className="panel space-y-5 p-5 sm:p-6">
				<h2 className="font-display text-lg font-extrabold tracking-tight text-ink-900">{scouting ? "Owner and rate" : !board && ownerProfiles.length > 1 ? "Owner and rate" : "Rate"}</h2>
				<div className="grid gap-4 sm:grid-cols-2">
					<Field label="Rate in naira" error={fieldErrors.rateMinor} hint={scouting ? "What the owner asks, if you know it." : undefined}>
						<Input name="rate" type="number" min="0" step="1000" defaultValue={board?.rate ? board.rate.amountMinor / 100 : ""} placeholder="850000" />
					</Field>
					<Field label="Per" error={fieldErrors.ratePeriod}>
						<Select name="ratePeriod" defaultValue={board?.rate?.period ?? "month"}>
							<option value="month">Month</option>
							<option value="week">Week</option>
						</Select>
					</Field>
				</div>
				<div className="grid gap-4 sm:grid-cols-2">
					<Field label="Who prints and puts up ads" error={fieldErrors.printsOwn}>
						<Select name="printsOwn" defaultValue={board?.printsOwn ? "1" : "0"}>
							<option value="0">A Greyboards billposter</option>
							<option value="1">{scouting ? "The owner or I do it" : "We do it ourselves"}</option>
						</Select>
					</Field>
					<Field label="Your print price in naira" error={fieldErrors.printFeeMinor} hint="Only when you print. Empty uses the standard price.">
						<Input name="printFee" type="number" min="0" step="1000" defaultValue={board?.ownPrintFeeMinor ? board.ownPrintFeeMinor / 100 : ""} placeholder="150000" />
					</Field>
				</div>
				{scouting && <OwnerPicker errors={fieldErrors} />}
				{!board && as === "owner" && <ManagedOwnerSelect profiles={ownerProfiles} error={fieldErrors.ownerProfileId} />}
			</section>

			{!board && (
				<section className="panel space-y-3 p-5 sm:p-6">
					<h2 className="font-display text-lg font-extrabold tracking-tight text-ink-900">A photo</h2>
					<p className="text-sm text-ink-500">Take it from the road, showing the whole board. We keep where it was taken so reviewers know you were there.</p>
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
