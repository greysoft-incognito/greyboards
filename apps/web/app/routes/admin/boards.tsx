import { Form, Link, useNavigation, useSearchParams } from "react-router";
import { BadgeCheck, Check, Copy, EyeOff, FileSignature, MapPin, Phone, X } from "lucide-react";
import type { AdminBoard, BoardReview, BoardStatus } from "@greyboards/types";
import { AdminHeader } from "~/components/admin/AdminHeader";
import { Avatar } from "~/components/Avatar";
import { BoardCover, BoardStatusBadge, formatRate, formatSize, mapLink } from "~/components/boards/BoardBits";
import { Pager } from "~/components/Pager";
import { Alert, Button, type Confirmation, Input, Select } from "~/components/ui";
import { formError } from "~/lib/api.server";
import { requireAdmin } from "~/lib/admin.server";
import { useToastMessage } from "~/lib/toast";
import type { Route } from "./+types/boards";

export const meta = () => [{ title: "Boards · Admin · Greyboards" }];

const STATUSES: { value: BoardStatus; label: string }[] = [
	{ value: "pending", label: "Waiting for review" },
	{ value: "listed", label: "On the map" },
	{ value: "rejected", label: "Not approved" },
	{ value: "unlisted", label: "Off the map" },
];

const AGREEMENT_LABELS = { sent: "Owner hasn't signed yet", signed: "Owner signed", declined: "Owner declined", cancelled: "Agreement replaced", expired: "Owner's link expired" } as const;

/** Photos taken farther than this from the board are flagged. */
const FAR_M = 150;

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireAdmin(request, context, "boards.review");
	const params = new URL(request.url).searchParams;
	const status = STATUSES.find((entry) => entry.value === params.get("status"))?.value ?? "pending";
	const result = await api.admin.boards({ status, page: Number(params.get("page")) || 1 });

	return { boards: result.data, meta: result.meta, status };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireAdmin(request, context, "boards.review");
	const form = await request.formData();
	const review = { status: String(form.get("status")), note: String(form.get("note") ?? "") || null } as BoardReview;

	try {
		const { data } = await api.admin.reviewBoard(String(form.get("id")), review);
		const outcome = { listed: "is on the map", rejected: "was not approved", unlisted: "is off the map" }[review.status];

		return { error: null, message: `${data.name} ${outcome}.` };
	} catch (error) {
		return { error: formError(error).error, message: null };
	}
}

/** Reviewers check each tagged board's place, photos and owner before advertisers can find it. */
export default function AdminBoards({ loaderData, actionData }: Route.ComponentProps) {
	useToastMessage(actionData);

	const { boards, meta, status } = loaderData;

	return (
		<>
			<AdminHeader title="Boards" description="Make sure each board is in the right place, the photos were taken there and the owner can be reached." />
			<div className="space-y-6 px-4 py-8 sm:px-8">
				<Form method="get" className="flex flex-wrap items-center gap-3">
					<Select name="status" defaultValue={status} aria-label="Status" className="w-auto">
						{STATUSES.map((entry) => (
							<option key={entry.value} value={entry.value}>
								{entry.label}
							</option>
						))}
					</Select>
					<Button type="submit" variant="secondary">
						Show
					</Button>
				</Form>

				{actionData?.error && <Alert>{actionData.error}</Alert>}

				{boards.length ? (
					<ul className="space-y-4">
						{boards.map((board) => (
							<BoardRow key={board.id} board={board} />
						))}
					</ul>
				) : (
					<p className="panel px-5 py-10 text-center text-sm text-ink-500">Nothing here right now.</p>
				)}

				<Pager meta={meta} noun="boards" />
			</div>
		</>
	);
}

function BoardRow({ board }: { board: AdminBoard }) {
	const navigation = useNavigation();
	const [params] = useSearchParams();
	const busy = navigation.state !== "idle" && navigation.formData?.get("id") === board.id;
	const rate = formatRate(board.rate);
	const far = board.photos.filter((photo) => photo.distanceM !== null && photo.distanceM > FAR_M).length;
	const unplaced = board.photos.filter((photo) => photo.distanceM === null).length;
	const decisions: { status: BoardReview["status"]; label: string; icon: typeof Check; variant: "primary" | "secondary" | "danger"; confirm: Confirmation }[] = [
		{ status: "listed", label: "List", icon: Check, variant: "primary", confirm: { title: `List ${board.name}?`, message: "Advertisers can find and book it straight away.", action: "List" } },
		{ status: "rejected", label: "Reject", icon: X, variant: "secondary", confirm: { title: `Reject ${board.name}?`, message: "The tagger sees your note.", action: "Reject", danger: true } },
		{ status: "unlisted", label: "Unlist", icon: EyeOff, variant: "danger", confirm: { title: `Unlist ${board.name}?`, message: "Advertisers won't be able to find or book it.", action: "Unlist", danger: true } },
	];

	return (
		<li className="panel grid gap-5 p-4 sm:p-5 md:grid-cols-[14rem_1fr]">
			<div className="space-y-2">
				<BoardCover board={board} />
				{board.photos.length > 1 && (
					<div className="flex gap-1.5">
						{board.photos.slice(1, 5).map((photo) => (
							<a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="h-12 flex-1 overflow-hidden rounded-lg">
								<img src={photo.url} alt="" loading="lazy" className="h-full w-full object-cover" />
							</a>
						))}
					</div>
				)}
			</div>
			<div className="min-w-0 space-y-3">
				<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
					<BoardStatusBadge status={board.status} />
					<span className="text-sm text-ink-500">Tagged {new Date(board.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
				</div>
				<h2 className="font-display text-xl leading-tight font-extrabold tracking-tight text-ink-900">
					<Link prefetch="intent" to={`/boards/${board.id}`} className="hover:text-brand-700">
						{board.name}
					</Link>
				</h2>
				<div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-700">
					<a href={mapLink(board.latitude, board.longitude)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-brand-700">
						<MapPin className="h-4 w-4 text-ink-500" aria-hidden />
						{[board.address, board.city].filter(Boolean).join(", ") || `${board.latitude.toFixed(5)}, ${board.longitude.toFixed(5)}`}
					</a>
					<span>
						{board.kindLabel}, {formatSize(board)}
					</span>
					{rate && <span className="font-semibold tabular-nums">{rate}</span>}
				</div>
				<p className={`text-sm ${far || unplaced || !board.photos.length ? "text-held" : "text-available"}`}>
					{!board.photos.length
						? "No photos yet."
						: far
							? `${far} of ${board.photos.length} ${board.photos.length === 1 ? "photo was" : "photos were"} taken over ${FAR_M} m from the board.`
							: unplaced
								? `${unplaced} of ${board.photos.length} ${board.photos.length === 1 ? "photo has" : "photos have"} no location.`
								: board.photos.length === 1
									? "The photo was taken at the board."
									: `All ${board.photos.length} photos were taken at the board.`}
				</p>
				{board.duplicateOf && (
					<p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-ink-700">
						<Copy className="mt-0.5 h-4 w-4 shrink-0 text-held" aria-hidden />
						<span>
							May be the same board as{" "}
							<Link prefetch="intent" to={`/boards/${board.duplicateOf.id}`} className="font-semibold text-brand-700 hover:underline">
								{board.duplicateOf.name}
							</Link>
							, tagged earlier nearby and facing the same way. The first tag with a signed owner wins.
						</span>
					</p>
				)}
				<div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-700">
					{board.tagger && (
						<span className="flex items-center gap-2">
							<Avatar user={board.tagger} size="sm" />
							<span>
								{board.owner?.userId === board.tagger.id ? "Owner " : "Scout "}
								<Link prefetch="intent" to={`/admin/users/${board.tagger.id}`} className="font-semibold hover:text-brand-700 hover:underline">
									{board.tagger.name}
								</Link>
							</span>
						</span>
					)}
					{board.owner && (
						<span className="flex items-center gap-1.5">
							<Phone className="h-4 w-4 text-ink-500" aria-hidden />
							{board.owner.name}
							{board.owner.claimed && <BadgeCheck className="h-4 w-4 text-brand-600" aria-label="On Greyboards" />}
							{board.owner.phone && (
								<a href={`tel:${board.owner.phone}`} className="tabular-nums hover:text-brand-700">
									{board.owner.phone}
								</a>
							)}
						</span>
					)}
					{board.agreement && (
						<span className="flex items-center gap-1.5">
							<FileSignature className="h-4 w-4 text-ink-500" aria-hidden />
							{AGREEMENT_LABELS[board.agreement.status]}
						</span>
					)}
				</div>
				<Form method="post" preventScrollReset action={`?${params}`} className="flex flex-wrap items-center gap-2 pt-1">
					<input type="hidden" name="id" value={board.id} />
					<Input name="note" defaultValue={board.reviewNote ?? ""} maxLength={191} placeholder="Note for the tagger (optional)" aria-label="Note" className="!py-2 min-w-0 flex-1 basis-48 text-sm" />
					{decisions
						.filter((decision) => decision.status !== board.status)
						.map((decision) => (
							<Button key={decision.status} type="submit" name="status" value={decision.status} variant={decision.variant} disabled={busy} className="!py-2" confirm={decision.confirm}>
								<decision.icon className="h-4 w-4" aria-hidden />
								{decision.label}
							</Button>
						))}
				</Form>
			</div>
		</li>
	);
}
