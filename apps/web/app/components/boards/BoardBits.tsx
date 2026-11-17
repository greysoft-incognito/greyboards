import { Link } from "react-router";
import { Lightbulb, MapPin, Ruler } from "lucide-react";
import type { Board, BoardRate, BoardStatus } from "@greyboards/types";
import { BoardScene } from "~/components/BoardScene";

const STATUS_LABELS: Record<BoardStatus, string> = {
	pending: "Waiting for review",
	listed: "On the map",
	rejected: "Not approved",
	unlisted: "Off the map",
};

const STATUS_STYLES: Record<BoardStatus, string> = {
	pending: "bg-amber-50 text-held",
	listed: "bg-emerald-50 text-available",
	rejected: "bg-red-50 text-red-700",
	unlisted: "bg-surface-100 text-ink-700",
};

/** Where a board's review stands, as a small badge. */
export function BoardStatusBadge({ status }: { status: BoardStatus }) {
	return (
		<span className={`inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[status]}`}>
			<span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
			{STATUS_LABELS[status]}
		</span>
	);
}

/** A rate such as "₦850,000 / month". */
export function formatRate(rate: BoardRate | null) {
	if (!rate) return null;

	const amount = new Intl.NumberFormat("en-NG", { style: "currency", currency: rate.currency, maximumFractionDigits: 0 }).format(rate.amountMinor / 100);

	return `${amount} / ${rate.period}`;
}

/** Width by height, such as "12 × 4 m". */
export function formatSize(board: Pick<Board, "widthM" | "heightM">) {
	const metres = (value: number) => Number(value.toFixed(1)).toString();

	return `${metres(board.widthM)} × ${metres(board.heightM)} m`;
}

/** The board's photo, or a drawn board when it has none yet. */
export function BoardCover({ board, className = "" }: { board: Pick<Board, "coverUrl" | "name" | "lit">; className?: string }) {
	return (
		<div className={`relative aspect-[400/260] overflow-hidden rounded-2xl bg-surface-100 ${className}`}>
			{board.coverUrl ? (
				<img src={board.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
			) : (
				<BoardScene time={board.lit ? "night" : "day"} art="empty" headline="Photo coming" />
			)}
		</div>
	);
}

/** A board in a grid: its photo, name, place, size and rate. */
export function BoardCard({ board, to }: { board: Board; to: string }) {
	const rate = formatRate(board.rate);

	return (
		<Link prefetch="intent" to={to} className="panel lift group flex flex-col gap-3 p-3">
			<BoardCover board={board} />
			<div className="flex flex-1 flex-col gap-2 px-1 pb-1">
				<BoardStatusBadge status={board.status} />
				<h3 className="font-display text-lg leading-tight font-extrabold tracking-tight text-ink-900 group-hover:text-brand-700">{board.name}</h3>
				<p className="flex items-center gap-1.5 text-sm text-ink-500">
					<MapPin className="h-4 w-4 shrink-0" aria-hidden />
					<span className="truncate">{[board.address, board.city].filter(Boolean).join(", ") || `${board.latitude.toFixed(5)}, ${board.longitude.toFixed(5)}`}</span>
				</p>
				<div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm text-ink-700">
					<span className="flex items-center gap-1.5">
						<Ruler className="h-4 w-4 text-ink-500" aria-hidden />
						{board.kindLabel}, {formatSize(board)}
					</span>
					{board.lit && (
						<span className="flex items-center gap-1.5">
							<Lightbulb className="h-4 w-4 text-ink-500" aria-hidden />
							Lit
						</span>
					)}
				</div>
				{rate && <p className="font-display text-base font-extrabold text-ink-900 tabular-nums">{rate}</p>}
			</div>
		</Link>
	);
}

/** A link to the point on OpenStreetMap, until the board map arrives. */
export function mapLink(latitude: number, longitude: number) {
	return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`;
}
