import { Link } from "react-router";
import { CalendarClock, MapPin, Ruler } from "lucide-react";
import type { PrintJob, PrintJobStatus } from "@greyboards/types";
import { BoardCover, formatSize } from "~/components/boards/BoardBits";
import { formatDay, formatMoney } from "~/components/bookings/BookingBits";

const STATUS_LABELS: Record<PrintJobStatus, string> = {
	open: "Open",
	reserved: "Held for you",
	confirmed: "Yours",
	printed: "Printed",
	posted: "Posted",
	cancelled: "Cancelled",
};

const STATUS_STYLES: Record<PrintJobStatus, string> = {
	open: "bg-emerald-50 text-available",
	reserved: "bg-amber-50 text-held",
	confirmed: "bg-brand-50 text-brand-700",
	printed: "bg-brand-50 text-brand-700",
	posted: "bg-surface-100 text-ink-700",
	cancelled: "bg-surface-100 text-ink-500",
};

export function JobStatusBadge({ status }: { status: PrintJobStatus }) {
	return (
		<span className={`inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[status]}`}>
			<span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
			{STATUS_LABELS[status]}
		</span>
	);
}

/** "800 m" close by, "12.4 km" further out. */
export function formatDistance(metres: number) {
	return metres < 1000 ? `${metres} m` : `${(metres / 1000).toFixed(1)} km`;
}

/** Where the board is, in words when we have them. */
export function boardPlace(board: NonNullable<PrintJob["board"]>) {
	return [board.address, board.city].filter(Boolean).join(", ") || `${board.latitude.toFixed(5)}, ${board.longitude.toFixed(5)}`;
}

/** A job in a list: the board, its size, how far, when it's due, and the pay. */
export function JobRow({ job }: { job: PrintJob }) {
	const board = job.board;

	return (
		<Link prefetch="intent" to={`/jobs/${job.id}`} className="panel lift group flex gap-4 p-3">
			{board && <BoardCover board={board} className="w-32 shrink-0 !rounded-xl max-sm:w-24" />}
			<div className="flex min-w-0 flex-1 flex-col gap-1.5 py-1">
				<JobStatusBadge status={job.status} />
				<h3 className="truncate font-display text-lg font-extrabold tracking-tight text-ink-900 group-hover:text-brand-700">{board?.name ?? "Board"}</h3>
				<div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-500">
					{board && (
						<span className="flex min-w-0 items-center gap-1.5">
							<MapPin className="h-4 w-4 shrink-0" aria-hidden />
							<span className="truncate">{job.distanceM !== null ? `${formatDistance(job.distanceM)} away` : boardPlace(board)}</span>
						</span>
					)}
					{board && (
						<span className="flex items-center gap-1.5">
							<Ruler className="h-4 w-4 shrink-0" aria-hidden />
							{formatSize(board)}
						</span>
					)}
					<span className="flex items-center gap-1.5">
						<CalendarClock className="h-4 w-4 shrink-0" aria-hidden />
						Up by {formatDay(job.dueOn)}
					</span>
				</div>
				<span className="font-display text-base font-extrabold text-ink-900 tabular-nums sm:hidden">{formatMoney(job.feeMinor, job.currency)}</span>
			</div>
			<div className="flex flex-col items-end justify-center gap-0.5 pr-2 text-right max-sm:hidden">
				<span className="font-display text-lg font-extrabold text-ink-900 tabular-nums">{formatMoney(job.feeMinor, job.currency)}</span>
				<span className="text-xs text-ink-500">{job.bonusMinor > 0 ? "With rush bonus" : "You earn"}</span>
			</div>
		</Link>
	);
}
