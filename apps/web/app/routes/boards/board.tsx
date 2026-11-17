import { useEffect, useRef, useState } from "react";
import { Form, Link, redirect, useNavigation, useSearchParams, useSubmit } from "react-router";
import { ArrowLeft, Camera, Compass, ExternalLink, Layers, Lightbulb, MapPin, Pencil, Phone, Ruler, Trash2, User, X } from "lucide-react";
import type { BoardDetail, BoardPhoto } from "@greyboards/types";
import { BoardCover, BoardStatusBadge, formatRate, formatSize, mapLink } from "~/components/boards/BoardBits";
import { Alert, Button, buttonClass, Spinner } from "~/components/ui";
import { formError } from "~/lib/api.server";
import { photoLocation, postedPhoto } from "~/lib/boards.server";
import { requireUser } from "~/lib/session.server";
import { toast, useToastMessage } from "~/lib/toast";
import type { Route } from "./+types/board";

export const meta = ({ loaderData }: Route.MetaArgs) => [{ title: `${loaderData?.board.name ?? "Board"} · Greyboards` }];

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const { api, user } = await requireUser(request, context);
	const { data: board } = await api.board(params.id);

	return { board, manages: board.ownerId === user.id || board.taggedById === user.id };
}

export async function action({ request, context, params }: Route.ActionArgs) {
	const { api } = await requireUser(request, context);
	const form = await request.formData();
	const intent = String(form.get("intent"));

	try {
		if (intent === "add-photo") {
			const photo = postedPhoto(form);

			if (!photo) return { error: "Choose a photo first.", message: null };

			await api.account.addBoardPhoto(params.id, photo, photoLocation(form));

			return { error: null, message: "Photo added." };
		}

		if (intent === "remove-photo") {
			await api.account.removeBoardPhoto(params.id, String(form.get("photo")));

			return { error: null, message: "Photo removed." };
		}

		if (intent === "remove") {
			await api.account.removeBoard(params.id);

			throw redirect("/boards");
		}
	} catch (error) {
		if (error instanceof Response) throw error;

		return { error: formError(error).error, message: null };
	}

	return { error: "Something went wrong. Try again.", message: null };
}

const REVIEW_NOTES: Record<BoardDetail["status"], string> = {
	pending: "We're checking this board. It goes on the map once it's approved.",
	listed: "Advertisers can find and book this board.",
	rejected: "This board wasn't approved. Fix what the note says and save it to send it back.",
	unlisted: "This board is off the map. Contact support to bring it back.",
};

/** A board's photos and details. Whoever looks after it can add photos, edit it or remove it. */
export default function BoardPage({ loaderData, actionData }: Route.ComponentProps) {
	useToastMessage(actionData);

	const { board, manages } = loaderData;
	const [params] = useSearchParams();
	const [shown, setShown] = useState<BoardPhoto | null>(board.photos[0] ?? null);
	const rate = formatRate(board.rate);

	useEffect(() => {
		if (params.has("tagged")) toast.success("Board tagged. We'll check it before it goes on the map.", { id: "tagged" });
		if (params.has("saved")) toast.success("Board saved.", { id: "saved" });
		if (params.get("photo") === "failed") toast.error("The board was tagged, but the photo didn't upload. Add it again below.", { id: "photo" });
	}, [params]);

	useEffect(() => {
		setShown((current) => board.photos.find((photo) => photo.id === current?.id) ?? board.photos[0] ?? null);
	}, [board.photos]);

	const facts = [
		{ icon: Ruler, label: `${board.kindLabel}, ${formatSize(board)}` },
		{ icon: Layers, label: board.faces === 1 ? "One face" : `${board.faces} faces` },
		board.facing ? { icon: Compass, label: board.facing } : null,
		{ icon: Lightbulb, label: board.lit ? "Lit at night" : "Not lit" },
	].filter((fact) => fact !== null);

	return (
		<main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
			<Link prefetch="intent" to="/boards" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
				<ArrowLeft className="h-4 w-4" aria-hidden />
				My boards
			</Link>

			<div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
				<section className="space-y-3">
					{shown ? (
						<div className="relative aspect-[400/260] overflow-hidden rounded-[1.75rem] bg-ink-900 shadow-[0_16px_36px_rgba(30,31,34,0.18)]">
							<img src={shown.url} alt={`${board.name}`} className="h-full w-full object-contain" />
							{manages && shown.distanceM !== null && (
								<span className="glass absolute bottom-3 left-3 rounded-full px-3 py-1.5 text-xs font-semibold text-ink-900">Taken {shown.distanceM} m from the board</span>
							)}
						</div>
					) : (
						<BoardCover board={board} className="rounded-[1.75rem] shadow-[0_16px_36px_rgba(30,31,34,0.18)]" />
					)}
					{(board.photos.length > 1 || manages) && (
						<div className="flex flex-wrap gap-2">
							{board.photos.map((photo) => (
								<PhotoThumb key={photo.id} photo={photo} active={photo.id === shown?.id} onShow={() => setShown(photo)} removable={manages} />
							))}
							{manages && <AddPhoto board={board} />}
						</div>
					)}
				</section>

				<section className="space-y-4">
					<div className="panel space-y-4 p-5 sm:p-6">
						<BoardStatusBadge status={board.status} />
						<h1 className="font-display text-3xl leading-tight font-extrabold tracking-[-0.03em] text-ink-900">{board.name}</h1>
						<a href={mapLink(board.latitude, board.longitude)} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-sm text-ink-500 hover:text-brand-700">
							<MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
							<span>
								{[board.address, board.city].filter(Boolean).join(", ") || "No address yet"}
								<span className="mt-0.5 flex items-center gap-1 tabular-nums">
									{board.latitude.toFixed(5)}, {board.longitude.toFixed(5)}
									<ExternalLink className="h-3.5 w-3.5" aria-hidden />
								</span>
							</span>
						</a>
						{rate && <p className="font-display text-2xl font-extrabold text-ink-900 tabular-nums">{rate}</p>}
						<ul className="grid gap-2 text-sm text-ink-700 sm:grid-cols-2">
							{facts.map((fact) => (
								<li key={fact.label} className="flex items-center gap-2">
									<fact.icon className="h-4 w-4 shrink-0 text-ink-500" aria-hidden />
									{fact.label}
								</li>
							))}
						</ul>
						{board.description && <p className="border-t border-surface-200 pt-4 text-sm whitespace-pre-line text-ink-700">{board.description}</p>}
					</div>

					{manages && (
						<div className="panel space-y-4 p-5 sm:p-6">
							<p className="text-sm text-ink-700">{REVIEW_NOTES[board.status]}</p>
							{board.reviewNote && <Alert>{board.reviewNote}</Alert>}
							{board.ownerPhone && (
								<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-700">
									<span className="flex items-center gap-2">
										<User className="h-4 w-4 text-ink-500" aria-hidden />
										{board.ownerName ?? "Owner"}
									</span>
									<a href={`tel:${board.ownerPhone}`} className="flex items-center gap-2 hover:text-brand-700">
										<Phone className="h-4 w-4 text-ink-500" aria-hidden />
										{board.ownerPhone}
									</a>
								</div>
							)}
							{actionData?.error && <Alert>{actionData.error}</Alert>}
							<div className="flex flex-wrap gap-2">
								<Link prefetch="intent" to={`/boards/${board.id}/edit`} className={buttonClass("secondary")}>
									<Pencil className="h-4 w-4" aria-hidden />
									Edit
								</Link>
								<RemoveBoard />
							</div>
						</div>
					)}
				</section>
			</div>
		</main>
	);
}

function PhotoThumb({ photo, active, onShow, removable }: { photo: BoardPhoto; active: boolean; onShow: () => void; removable: boolean }) {
	const navigation = useNavigation();
	const removing = navigation.formData?.get("photo") === photo.id;

	return (
		<div className={`group relative h-20 w-28 overflow-hidden rounded-xl transition ${active ? "ring-[3px] ring-brand-500" : "ring-1 ring-surface-200"} ${removing ? "opacity-40" : ""}`}>
			<button type="button" onClick={onShow} className="h-full w-full" aria-label="Show this photo">
				<img src={photo.url} alt="" loading="lazy" className="h-full w-full object-cover" />
			</button>
			{removable && (
				<Form method="post" preventScrollReset className="absolute top-1 right-1">
					<input type="hidden" name="intent" value="remove-photo" />
					<input type="hidden" name="photo" value={photo.id} />
					<button type="submit" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-ink-700 opacity-0 shadow transition group-hover:opacity-100 focus:opacity-100 max-sm:opacity-100" aria-label="Remove this photo">
						<X className="h-4 w-4" aria-hidden />
					</button>
				</Form>
			)}
		</div>
	);
}

/** Picks a photo, then sends it with where the phone is, so reviewers can tell it was taken at the board. */
function AddPhoto({ board }: { board: BoardDetail }) {
	const navigation = useNavigation();
	const submit = useSubmit();
	const form = useRef<HTMLFormElement>(null);
	const busy = navigation.formData?.get("intent") === "add-photo";
	const full = board.photos.length >= 12;

	const send = () => {
		const element = form.current;

		if (!element) return;

		const fill = (coords?: GeolocationCoordinates) => {
			(element.elements.namedItem("latitude") as HTMLInputElement).value = coords ? String(coords.latitude) : "";
			(element.elements.namedItem("longitude") as HTMLInputElement).value = coords ? String(coords.longitude) : "";
			(element.elements.namedItem("accuracyM") as HTMLInputElement).value = coords ? String(Math.round(coords.accuracy)) : "";
			submit(element);
		};

		if (!("geolocation" in navigator)) return fill();

		navigator.geolocation.getCurrentPosition(
			(position) => fill(position.coords),
			() => fill(),
			{ enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
		);
	};

	if (full) return null;

	return (
		<Form ref={form} method="post" encType="multipart/form-data" preventScrollReset>
			<input type="hidden" name="intent" value="add-photo" />
			<input type="hidden" name="latitude" />
			<input type="hidden" name="longitude" />
			<input type="hidden" name="accuracyM" />
			<label className={`flex h-20 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-surface-300 text-xs font-semibold text-ink-500 transition hover:border-brand-300 hover:text-brand-700 ${busy ? "pointer-events-none opacity-60" : ""}`}>
				{busy ? <Spinner className="h-5 w-5" /> : <Camera className="h-5 w-5" aria-hidden />}
				{busy ? "Uploading" : "Add photo"}
				<input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/heic" capture="environment" className="sr-only" onChange={(event) => event.currentTarget.files?.length && send()} />
			</label>
		</Form>
	);
}

/** Asks once more before removing the board, without a browser dialog. */
function RemoveBoard() {
	const [sure, setSure] = useState(false);
	const navigation = useNavigation();
	const busy = navigation.formData?.get("intent") === "remove";

	if (!sure) {
		return (
			<Button variant="ghost" onClick={() => setSure(true)}>
				<Trash2 className="h-4 w-4" aria-hidden />
				Remove
			</Button>
		);
	}

	return (
		<Form method="post" className="flex flex-wrap items-center gap-2">
			<input type="hidden" name="intent" value="remove" />
			<Button type="submit" variant="danger" disabled={busy}>
				{busy ? <Spinner /> : <Trash2 className="h-4 w-4" aria-hidden />}
				Remove this board and its photos
			</Button>
			<Button variant="ghost" onClick={() => setSure(false)}>
				Keep it
			</Button>
		</Form>
	);
}
