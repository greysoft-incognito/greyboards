import { Link, NavLink, useSearchParams } from "react-router";
import { CalendarSearch } from "lucide-react";
import { BookingRow, formatMoney } from "~/components/bookings/BookingBits";
import { BoardScene } from "~/components/BoardScene";
import { Pager } from "~/components/Pager";
import { Alert, buttonClass } from "~/components/ui";
import { requireUser } from "~/lib/session.server";
import type { Route } from "./+types/index";

export const meta = () => [{ title: "Bookings · Greyboards" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api, user } = await requireUser(request, context);
	const params = new URL(request.url).searchParams;
	const looksAfterBoards = user.accountRoles.some((role) => role.kind === "owner" || role.kind === "scout");
	const onBoards = looksAfterBoards && params.get("view") === "boards";
	const page = Number(params.get("page")) || 1;
	const result = onBoards ? await api.account.boardBookings({ page }) : await api.account.bookings({ page });

	return { bookings: result.data, meta: result.meta, onBoards, looksAfterBoards };
}

const tab = ({ isActive }: { isActive: boolean }) =>
	`rounded-xl px-4 py-2 text-sm font-semibold transition ${isActive ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-surface-100"}`;

/** Bookings the account made, and, for owners and scouts, the paid bookings on their boards. */
export default function Bookings({ loaderData }: Route.ComponentProps) {
	const { bookings, meta, onBoards, looksAfterBoards } = loaderData;
	const [params] = useSearchParams();

	return (
		<main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-4xl">Bookings</h1>
					<p className="mt-1 text-ink-500">{onBoards ? "Paid bookings on boards you look after, and what each one pays you." : "Boards you've booked. Payments wait in escrow until your ad is up."}</p>
				</div>
				{looksAfterBoards && (
					<nav aria-label="Bookings" className="glass flex gap-1 rounded-2xl p-1">
						<NavLink to="/bookings" end className={() => tab({ isActive: !onBoards })}>
							My bookings
						</NavLink>
						<NavLink to="/bookings?view=boards" className={() => tab({ isActive: onBoards })}>
							On my boards
						</NavLink>
					</nav>
				)}
			</div>

			{params.get("payment") === "unknown" && (
				<div className="mt-4">
					<Alert>We couldn't confirm that payment yet. If money left your account, it will show here shortly.</Alert>
				</div>
			)}

			{bookings.length ? (
				<div className="mt-6 space-y-3">
					{bookings.map((booking) => (
						<BookingRow
							key={booking.id}
							booking={booking}
							amountLabel={onBoards && booking.split ? `Owner gets ${formatMoney(booking.split.ownerAmountMinor, booking.currency)}` : undefined}
						/>
					))}
				</div>
			) : (
				<section className="panel mt-6 flex flex-col items-center gap-5 px-6 py-10 text-center">
					<div className="aspect-[400/260] w-64 overflow-hidden rounded-2xl">
						<BoardScene time="day" art="empty" headline="Your ad here" />
					</div>
					<div>
						<h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900">{onBoards ? "No paid bookings yet" : "No bookings yet"}</h2>
						<p className="mt-1 max-w-md text-sm text-ink-500">
							{onBoards ? "When an advertiser pays for one of your boards, it shows here with what you'll receive." : "Find a board on the map, pick your dates and pay. We hold the money until your ad is up."}
						</p>
					</div>
					{!onBoards && (
						<Link prefetch="intent" to="/map" className={buttonClass("primary")}>
							<CalendarSearch className="h-4 w-4" aria-hidden />
							Find a board
						</Link>
					)}
				</section>
			)}

			<div className="mt-6">
				<Pager meta={meta} noun="bookings" />
			</div>
		</main>
	);
}
