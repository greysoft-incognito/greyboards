import { Link, NavLink, redirect, useSearchParams } from "react-router";
import type { Auction, Booking, Offer } from "@greyboards/types";
import { BidRow, OfferRow, toMinor } from "~/components/bids/BidBits";
import { CalendarSearch } from "lucide-react";
import { BookingRow, formatMoney } from "~/components/bookings/BookingBits";
import { BoardScene } from "~/components/BoardScene";
import { Pager } from "~/components/Pager";
import { Alert, buttonClass, Notice } from "~/components/ui";
import { formError } from "~/lib/api.server";
import { useToastMessage } from "~/lib/toast";
import { requireUser } from "~/lib/session.server";
import type { Route } from "./+types/index";

export const meta = () => [{ title: "Bookings · Greyboards" }];

type View = "mine" | "boards" | "offers" | "board-offers" | "bids";

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api, user } = await requireUser(request, context);
	const params = new URL(request.url).searchParams;
	const looksAfterBoards = user.accountRoles.some((role) => role.kind === "owner" || role.kind === "scout");
	const asked = (params.get("view") ?? "mine") as View;
	const view: View = !looksAfterBoards && (asked === "boards" || asked === "board-offers") ? "mine" : asked;
	const page = Number(params.get("page")) || 1;
	const empty = { bookings: [] as Booking[], offers: [] as Offer[], auctions: [] as Auction[] };

	if (view === "offers" || view === "board-offers") {
		const result = view === "offers" ? await api.account.offers({ page }) : await api.account.boardOffers({ page });

		return { ...empty, offers: result.data, meta: result.meta, view, looksAfterBoards };
	}

	if (view === "bids") {
		const result = await api.account.bids({ page });

		return { ...empty, auctions: result.data, meta: result.meta, view, looksAfterBoards };
	}

	const result = view === "boards" ? await api.account.boardBookings({ page }) : await api.account.bookings({ page });

	return { ...empty, bookings: result.data, meta: result.meta, view, looksAfterBoards };
}

/** Answers to offers: accept, decline, counter or withdraw. */
export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireUser(request, context);
	const form = await request.formData();
	const intent = String(form.get("intent"));
	const id = String(form.get("id"));

	try {
		if (intent === "accept-offer") {
			const { data: booking, message } = await api.acceptOffer(id);

			if (form.get("mine") === "1") throw redirect(`/bookings/${booking.id}`);

			return { error: null, message: message ?? "Offer accepted." };
		}

		if (intent === "decline-offer") return { error: null, message: (await api.declineOffer(id)).message ?? "Offer declined." };
		if (intent === "counter-offer") return { error: null, message: (await api.counterOffer(id, toMinor(form.get("amount")))).message ?? "Counter sent." };
		if (intent === "withdraw-offer") return { error: null, message: (await api.withdrawOffer(id)).message ?? "Offer withdrawn." };
	} catch (error) {
		if (error instanceof Response) throw error;

		return { error: formError(error).error, message: null };
	}

	return { error: "Something went wrong. Try again.", message: null };
}

const INTROS: Record<View, string> = {
	mine: "Boards you've booked. Payments wait in escrow until your ad is up.",
	boards: "Paid bookings on boards you look after, and what each one pays you.",
	offers: "Offers you made below a board's price. Once accepted, the dates are held for you to pay.",
	"board-offers": "Offers advertisers made on your boards. Accept, decline or name your price.",
	bids: "Dates you bid for. If you win, you have a day to pay.",
};

const tab = ({ isActive }: { isActive: boolean }) =>
	`rounded-xl px-4 py-2 text-sm font-semibold transition ${isActive ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-surface-100"}`;

/** Bookings the account made, its offers and bids, and, for owners and scouts, the bookings and offers on their boards. */
export default function Bookings({ loaderData, actionData }: Route.ComponentProps) {
	useToastMessage(actionData);

	const { bookings, offers, auctions, meta, view, looksAfterBoards } = loaderData;
	const [params] = useSearchParams();
	const views: { view: View; label: string }[] = [
		{ view: "mine", label: "My bookings" },
		...(looksAfterBoards ? [{ view: "boards" as const, label: "On my boards" }] : []),
		{ view: "offers", label: "My offers" },
		...(looksAfterBoards ? [{ view: "board-offers" as const, label: "Offers to me" }] : []),
		{ view: "bids", label: "My bids" },
	];
	const count = view === "offers" || view === "board-offers" ? offers.length : view === "bids" ? auctions.length : bookings.length;

	return (
		<main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-4xl">Bookings</h1>
					<p className="mt-1 text-ink-500">{INTROS[view]}</p>
				</div>
				<nav aria-label="Bookings" className="glass flex max-w-full gap-1 overflow-x-auto rounded-2xl p-1">
					{views.map((entry) => (
						<NavLink key={entry.view} to={entry.view === "mine" ? "/bookings" : `/bookings?view=${entry.view}`} end className={() => `${tab({ isActive: view === entry.view })} shrink-0`}>
							{entry.label}
						</NavLink>
					))}
				</nav>
			</div>

			{params.get("payment") === "unknown" && (
				<div className="mt-4">
					<Alert>We couldn't confirm that payment yet. If money left your account, it will show here shortly.</Alert>
				</div>
			)}
			{params.get("sent") === "1" && view === "offers" && (
				<div className="mt-4">
					<Notice>Offer sent. We'll show the owner's answer here.</Notice>
				</div>
			)}
			{actionData?.error && (
				<div className="mt-4">
					<Alert>{actionData.error}</Alert>
				</div>
			)}

			{count ? (
				<div className="mt-6 space-y-3">
					{bookings.map((booking) => (
						<BookingRow key={booking.id} booking={booking} amountLabel={view === "boards" && booking.split ? `Owner gets ${formatMoney(booking.split.ownerAmountMinor, booking.currency)}` : undefined} />
					))}
					{offers.map((offer) => (
						<OfferRow key={offer.id} offer={offer} onBoards={view === "board-offers"} />
					))}
					{auctions.map((auction) => (
						<BidRow key={auction.id} auction={auction} />
					))}
				</div>
			) : (
				<section className="panel mt-6 flex flex-col items-center gap-5 px-6 py-10 text-center">
					<div className="aspect-[400/260] w-64 overflow-hidden rounded-2xl">
						<BoardScene time="day" art="empty" headline="Your ad here" />
					</div>
					<div>
						<h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900">{EMPTY[view].title}</h2>
						<p className="mt-1 max-w-md text-sm text-ink-500">{EMPTY[view].body}</p>
					</div>
					{(view === "mine" || view === "offers" || view === "bids") && (
						<Link prefetch="intent" to="/map" className={buttonClass("primary")}>
							<CalendarSearch className="h-4 w-4" aria-hidden />
							Find a board
						</Link>
					)}
				</section>
			)}

			<div className="mt-6">
				<Pager meta={meta} noun={view === "bids" ? "auctions" : view.includes("offers") ? "offers" : "bookings"} />
			</div>
		</main>
	);
}

const EMPTY: Record<View, { title: string; body: string }> = {
	mine: { title: "No bookings yet", body: "Find a board on the map, pick your dates and pay. We hold the money until your ad is up." },
	boards: { title: "No paid bookings yet", body: "When an advertiser pays for one of your boards, it shows here with what you'll receive." },
	offers: { title: "No offers yet", body: "On a board's page, choose Make an offer instead to suggest your own price for the dates." },
	"board-offers": { title: "No offers yet", body: "When an advertiser offers less than your price, it shows here for you to answer." },
	bids: { title: "No bids yet", body: "Boards with dates open for bids show them on their page. Bid there." },
};
