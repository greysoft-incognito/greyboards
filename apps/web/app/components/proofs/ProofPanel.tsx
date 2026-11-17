import { useRef, useState } from "react";
import { Form, useNavigation, useSubmit } from "react-router";
import { BadgeCheck, Camera, Check, Flag, MapPin, Send, X } from "lucide-react";
import type { BookingProof } from "@greyboards/types";
import { Button, Spinner, Textarea } from "~/components/ui";

/** A moment such as "19 Nov, 4:30 PM", in Nigerian time, where the boards are. */
export function formatMoment(value: string) {
	return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos" }).format(new Date(value));
}

/**
 * Proof the ad is up. Whoever photographs the ad adds geotagged photos taken at the board
 * and sends them; the advertiser accepts, which pays everyone, or says what to fix.
 */
export function ProofPanel({ proof }: { proof: BookingProof }) {
	const navigation = useNavigation();
	const intent = navigation.formData?.get("intent");
	const enough = proof.photos.length >= proof.minPhotos;

	return (
		<div className="panel space-y-4 p-5 sm:p-6">
			<div className="flex items-start gap-3">
				<span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${proof.status === "accepted" ? "bg-emerald-50 text-available" : "bg-brand-50 text-brand-700"}`}>
					{proof.status === "accepted" ? <BadgeCheck className="h-5 w-5" aria-hidden /> : <Camera className="h-5 w-5" aria-hidden />}
				</span>
				<div>
					<h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900">Proof it's up</h2>
					<p className="mt-0.5 text-sm text-ink-500">{explain(proof)}</p>
				</div>
			</div>

			{proof.status === "disputed" && proof.note && (
				<p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
					<span className="font-semibold">The advertiser said: </span>
					{proof.note}
				</p>
			)}

			{proof.photos.length > 0 && (
				<ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
					{proof.photos.map((photo) => (
						<li key={photo.id} className="relative overflow-hidden rounded-xl bg-surface-100">
							<a href={photo.url} target="_blank" rel="noreferrer">
								<img src={photo.url} alt="The ad on the board" className="aspect-[4/3] w-full object-cover" />
							</a>
							<span className="glass absolute bottom-2 left-2 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-ink-900">
								<MapPin className="h-3 w-3" aria-hidden />
								{photo.distanceM} m away
							</span>
							{proof.canAdd && (
								<Form method="post" preventScrollReset className="absolute top-2 right-2">
									<input type="hidden" name="intent" value="remove-proof" />
									<input type="hidden" name="photo" value={photo.id} />
									<button type="submit" aria-label="Remove this photo" disabled={!!intent} className="glass flex h-8 w-8 items-center justify-center rounded-full text-ink-900 transition hover:text-red-700">
										<X className="h-4 w-4" aria-hidden />
									</button>
								</Form>
							)}
						</li>
					))}
				</ul>
			)}

			{proof.canAdd && (
				<div className="flex flex-wrap items-center gap-2">
					{proof.photos.length < proof.maxPhotos && <AddProofPhoto busy={intent === "add-proof"} primary={!enough} />}
					{enough && (
						<Form method="post" preventScrollReset>
							<input type="hidden" name="intent" value="submit-proof" />
							<Button type="submit" disabled={!!intent}>
								{intent === "submit-proof" ? <Spinner /> : <Send className="h-4 w-4" aria-hidden />}
								Send to the advertiser
							</Button>
						</Form>
					)}
					<span className="text-xs text-ink-500 tabular-nums">
						{proof.photos.length} of {proof.minPhotos}+ photos
					</span>
				</div>
			)}

			{proof.canReview && <ReviewProof />}
		</div>
	);
}

function explain(proof: BookingProof) {
	if (proof.status === "accepted") return `Accepted${proof.acceptedAt ? ` ${formatMoment(proof.acceptedAt)}` : ""}. The money left escrow and everyone is paid.`;
	if (proof.status === "submitted" && proof.canReview) {
		return `Check the photos. Accepting puts your ad live and pays everyone.${proof.acceptsAt ? ` If you don't answer by ${formatMoment(proof.acceptsAt)}, it counts as accepted.` : ""}`;
	}
	if (proof.status === "submitted") return `With the advertiser to check.${proof.acceptsAt ? ` It counts as accepted at ${formatMoment(proof.acceptsAt)} if they don't answer.` : ""}`;
	if (proof.canAdd) return `Once it's up, take at least ${proof.minPhotos} photos showing the whole ad, standing within ${proof.maxDistanceM} m of the board with location on.`;

	return "Once the ad is up, photos taken at the board show here for you to check. Nobody is paid until then.";
}

/** Takes a photo and sends it with where the phone is. Proof without a location isn't accepted. */
function AddProofPhoto({ busy, primary }: { busy: boolean; primary: boolean }) {
	const form = useRef<HTMLFormElement>(null);
	const submit = useSubmit();
	const [locating, setLocating] = useState(false);

	const send = () => {
		const element = form.current;

		if (!element) return;

		const fill = (coords?: GeolocationCoordinates) => {
			(element.elements.namedItem("latitude") as HTMLInputElement).value = coords ? String(coords.latitude) : "";
			(element.elements.namedItem("longitude") as HTMLInputElement).value = coords ? String(coords.longitude) : "";
			(element.elements.namedItem("accuracyM") as HTMLInputElement).value = coords ? String(Math.round(coords.accuracy)) : "";
			setLocating(false);
			submit(element, { preventScrollReset: true });
		};

		if (!("geolocation" in navigator)) return fill();

		setLocating(true);
		navigator.geolocation.getCurrentPosition(
			(position) => fill(position.coords),
			() => fill(),
			{ enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
		);
	};

	const working = busy || locating;

	return (
		<Form ref={form} method="post" encType="multipart/form-data" preventScrollReset>
			<input type="hidden" name="intent" value="add-proof" />
			<input type="hidden" name="latitude" />
			<input type="hidden" name="longitude" />
			<input type="hidden" name="accuracyM" />
			<label
				className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[0.875rem] border-[1.5px] px-4 py-2.5 text-sm font-semibold transition ${
					primary ? "border-transparent bg-brand-500 text-white shadow-[0_10px_24px_rgba(131,59,75,0.3)] hover:bg-brand-600" : "border-surface-100 bg-white text-ink-900 hover:border-surface-200"
				} ${working ? "pointer-events-none opacity-60" : ""}`}
			>
				{working ? <Spinner /> : <Camera className="h-4 w-4" aria-hidden />}
				{locating ? "Finding you" : busy ? "Uploading" : "Take a photo"}
				<input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/heic" capture="environment" className="sr-only" onChange={(event) => event.currentTarget.files?.length && send()} />
			</label>
		</Form>
	);
}

/** Accept, or say what's wrong so better photos come back. */
function ReviewProof() {
	const navigation = useNavigation();
	const intent = navigation.formData?.get("intent");
	const [disputing, setDisputing] = useState(false);

	if (disputing) {
		return (
			<Form method="post" preventScrollReset className="space-y-3">
				<input type="hidden" name="intent" value="dispute-proof" />
				<label className="block text-sm font-semibold text-ink-700">
					What's wrong?
					<Textarea name="note" required maxLength={500} rows={3} className="mt-1" placeholder="The left side is hidden by a tree. Please take one from across the road." />
				</label>
				<div className="flex flex-wrap gap-2">
					<Button type="submit" variant="danger" disabled={!!intent}>
						{intent === "dispute-proof" ? <Spinner /> : <Flag className="h-4 w-4" aria-hidden />}
						Send it back
					</Button>
					<Button variant="ghost" onClick={() => setDisputing(false)}>
						Keep checking
					</Button>
				</div>
			</Form>
		);
	}

	return (
		<div className="flex flex-wrap gap-2">
			<Form method="post" preventScrollReset>
				<input type="hidden" name="intent" value="accept-proof" />
				<Button type="submit" disabled={!!intent}>
					{intent === "accept-proof" ? <Spinner /> : <Check className="h-4 w-4" aria-hidden />}
					It's up, accept
				</Button>
			</Form>
			<Button variant="ghost" onClick={() => setDisputing(true)}>
				<Flag className="h-4 w-4" aria-hidden />
				Report a problem
			</Button>
		</div>
	);
}
