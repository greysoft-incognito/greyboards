import { Link } from "react-router";
import { CalendarDays } from "lucide-react";
import { type Booking, type BookingStatus, formatMoney } from "@greyboards/types";
import { BoardCover } from "~/components/boards/BoardBits";

const STATUS_LABELS: Record<BookingStatus, string> = {
	held: "Waiting for payment",
	paid: "Paid",
	live: "Up on the board",
	completed: "Finished",
	cancelled: "Cancelled",
	expired: "Expired",
};

const STATUS_STYLES: Record<BookingStatus, string> = {
	held: "bg-amber-50 text-held",
	paid: "bg-brand-50 text-brand-700",
	live: "bg-emerald-50 text-available",
	completed: "bg-surface-100 text-ink-700",
	cancelled: "bg-surface-100 text-ink-500",
	expired: "bg-surface-100 text-ink-500",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
	return (
		<span className={`inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[status]}`}>
			<span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
			{STATUS_LABELS[status]}
		</span>
	);
}

export { formatMoney };

/** A day such as "31 Jan 2027". Days are calendar days, so they're read in UTC. */
export function formatDay(day: string) {
	return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));
}

/** Both days of a run, such as "31 Jan 2027 to 30 Mar 2027". */
export function formatDays({ startsOn, endsOn }: { startsOn: string; endsOn: string }) {
	return `${formatDay(startsOn)} to ${formatDay(endsOn)}`;
}

/** A booking in a list: the board, the days, the amount and where it stands. */
export function BookingRow({ booking, amountMinor = booking.amountMinor, amountLabel }: { booking: Booking; amountMinor?: number; amountLabel?: string }) {
	return (
		<Link prefetch="intent" to={`/bookings/${booking.id}`} className="panel lift group flex gap-4 p-3">
			{booking.board && <BoardCover board={booking.board} className="w-32 shrink-0 !rounded-xl max-sm:w-24" />}
			<div className="flex min-w-0 flex-1 flex-col gap-1.5 py-1">
				<BookingStatusBadge status={booking.status} />
				<h3 className="truncate font-display text-lg font-extrabold tracking-tight text-ink-900 group-hover:text-brand-700">{booking.board?.name ?? "Board"}</h3>
				<p className="flex items-center gap-1.5 text-sm text-ink-500">
					<CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
					{formatDays(booking)}
				</p>
			</div>
			<div className="flex flex-col items-end justify-center gap-0.5 pr-2 text-right">
				<span className="font-display text-lg font-extrabold text-ink-900 tabular-nums">{formatMoney(amountMinor, booking.currency)}</span>
				{amountLabel && <span className="text-xs text-ink-500">{amountLabel}</span>}
			</div>
		</Link>
	);
}
