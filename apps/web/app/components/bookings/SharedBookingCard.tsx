import { Form, Link, useNavigation } from "react-router";
import { CreditCard, Gavel, Lock, UsersRound } from "lucide-react";
import type { SharedBooking } from "@greyboards/types";
import { formatDay, formatMoney } from "./BookingBits";
import { Alert, Button, Field, Input, Spinner } from "~/components/ui";

/** "21 Nov, 4 PM" in Nigerian time. */
function moment(value: string) {
	return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "numeric", hour12: true, timeZone: "Africa/Lagos" }).format(new Date(value));
}

/** What the viewer sees of the bidding for the whole board. */
function biddingNote(shared: SharedBooking) {
	const auction = shared.auction;
	const mine = auction?.myBid;

	if (!auction) {
		return `Not every share was paid, so the whole board is open to bids from ${formatMoney(shared.amountMinor, shared.currency)} until ${moment(shared.bidsCloseAt)}. If the winner pays, everyone who shared gets a refund.`;
	}

	const highest = auction.highestMinor !== null ? `Highest bid ${formatMoney(auction.highestMinor, auction.currency)}` : "Bids stay hidden until bidding ends";

	if (auction.status === "awarded") {
		return mine?.status === "won" ? `You won the whole board! Pay by ${auction.payBy ? moment(auction.payBy) : "the deadline"} to keep it.` : "Bidding closed. The winner is paying for the whole board.";
	}

	const yours = mine ? (mine.leading ? " You're the highest bidder." : auction.format === "open" ? " You've been outbid." : "") : "";

	return `The whole board is up for bids: ${highest} from ${auction.bidCount} ${auction.bidCount === 1 ? "bid" : "bids"}, closing ${moment(auction.closesAt)}.${yours} If every share gets paid first, the sharers keep it.`;
}

/**
 * A shared booking anyone can join: the days, what a share costs and how many are left. Once
 * its lock ends with shares unpaid, the whole board goes up for bids, from the full price.
 */
export function SharedBookingCard({ shared, showBoard = false, canJoin, error }: { shared: SharedBooking; showBoard?: boolean; canJoin: boolean; error?: string | null }) {
	const navigation = useNavigation();
	const busy = navigation.formData?.get("bookingId") === shared.id ? navigation.formData.get("intent") : null;
	const auction = shared.auction;
	const minimum = auction?.nextMinimumMinor ?? shared.amountMinor;
	const won = auction?.status === "awarded" && auction.myBid?.status === "won";

	return (
		<div className="panel space-y-3 p-5">
			<div className="flex items-start gap-3">
				<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
					<UsersRound className="h-5 w-5" aria-hidden />
				</span>
				<div className="min-w-0">
					{showBoard && shared.board && (
						<Link prefetch="intent" to={`/boards/${shared.board.id}`} className="block truncate font-display text-lg font-extrabold tracking-tight text-ink-900 hover:text-brand-700">
							{shared.board.name}
						</Link>
					)}
					<p className="font-semibold text-ink-900">
						Shared {formatDay(shared.startsOn)} to {formatDay(shared.endsOn)}
					</p>
					<p className="text-sm text-ink-500">
						{shared.openCount} of {shared.count} shares left{shared.organiser ? `, started by ${shared.organiser}` : ""}. Everyone's design is merged into one print.
					</p>
				</div>
			</div>
			<p className="flex items-center gap-2 text-sm text-ink-700">
				{shared.takeoverOpen || auction ? <Gavel className="h-4 w-4 shrink-0 text-brand-600" aria-hidden /> : <Lock className="h-4 w-4 shrink-0 text-ink-500" aria-hidden />}
				{shared.takeoverOpen || auction
					? biddingNote(shared)
					: `Reserved for sharers until ${moment(shared.lockedUntil)}. If any shares are still unpaid then, the whole board goes up for bids.`}
			</p>
			{shared.joined ? (
				<Link prefetch="intent" to={`/bookings/${shared.id}`} className="inline-block text-sm font-semibold text-brand-700 hover:underline">
					You're sharing this. See the booking
				</Link>
			) : (
				canJoin && (
					<div className="flex flex-wrap gap-2">
						{shared.shareAmountMinor !== null && (
							<Form method="post">
								<input type="hidden" name="intent" value="join-share" />
								<input type="hidden" name="bookingId" value={shared.id} />
								<Button type="submit" disabled={!!busy}>
									{busy === "join-share" ? <Spinner /> : <UsersRound className="h-4 w-4" aria-hidden />}
									Join for {formatMoney(shared.shareAmountMinor, shared.currency)}
								</Button>
							</Form>
						)}
						{won && auction.myBid && (
							<Form method="post">
								<input type="hidden" name="intent" value="pay-takeover" />
								<input type="hidden" name="bookingId" value={shared.id} />
								<Button type="submit" disabled={!!busy}>
									{busy === "pay-takeover" ? <Spinner /> : <CreditCard className="h-4 w-4" aria-hidden />}
									Pay {formatMoney(auction.myBid.amountMinor, auction.currency)} for the whole board
								</Button>
							</Form>
						)}
					</div>
				)
			)}
			{!shared.joined && canJoin && shared.takeoverOpen && (
				<Form method="post" preventScrollReset className="flex flex-wrap items-end gap-2 border-t border-surface-200 pt-3">
					<input type="hidden" name="intent" value="takeover-bid" />
					<input type="hidden" name="bookingId" value={shared.id} />
					<Field label="Bid for the whole board" hint={`At least ${formatMoney(minimum, shared.currency)}`}>
						<Input name="amount" type="number" min={minimum / 100} step="1000" defaultValue={minimum / 100} required />
					</Field>
					<Button type="submit" variant="secondary" disabled={!!busy}>
						{busy === "takeover-bid" ? <Spinner /> : <Gavel className="h-4 w-4" aria-hidden />}
						{auction?.myBid ? "Raise my bid" : "Place bid"}
					</Button>
				</Form>
			)}
			{error && <Alert>{error}</Alert>}
		</div>
	);
}
