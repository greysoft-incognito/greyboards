import { useState } from "react";
import { Form, Link, useNavigation } from "react-router";
import { CalendarDays, Check, Gavel, HandCoins, Timer, Undo2, X } from "lucide-react";
import type { Auction, AuctionStatus, BoardDetail, Offer, OfferStatus } from "@greyboards/types";
import { BoardCover } from "~/components/boards/BoardBits";
import { formatDays, formatMoney } from "~/components/bookings/BookingBits";
import { Alert, Button, buttonClass, Field, Input, Select, Spinner } from "~/components/ui";

const AUCTION_LABELS: Record<AuctionStatus, { label: string; tone: string }> = {
	open: { label: "Taking bids", tone: "bg-brand-50 text-brand-700" },
	awarded: { label: "Won, waiting for payment", tone: "bg-amber-50 text-held" },
	sold: { label: "Sold", tone: "bg-emerald-50 text-available" },
	unsold: { label: "Not sold", tone: "bg-surface-100 text-ink-500" },
	cancelled: { label: "Closed early", tone: "bg-surface-100 text-ink-500" },
};

const OFFER_LABELS: Record<OfferStatus, { label: string; tone: string }> = {
	pending: { label: "Waiting for an answer", tone: "bg-amber-50 text-held" },
	countered: { label: "Countered", tone: "bg-brand-50 text-brand-700" },
	accepted: { label: "Accepted", tone: "bg-emerald-50 text-available" },
	declined: { label: "Declined", tone: "bg-surface-100 text-ink-500" },
	withdrawn: { label: "Withdrawn", tone: "bg-surface-100 text-ink-500" },
	expired: { label: "Lapsed", tone: "bg-surface-100 text-ink-500" },
};

function Badge({ label, tone }: { label: string; tone: string }) {
	return (
		<span className={`inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>
			<span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
			{label}
		</span>
	);
}

/** "Closes Tue 3 Feb, 14:00" in the viewer's time. */
export function formatMoment(moment: string) {
	return new Intl.DateTimeFormat(undefined, {
		weekday: "short",
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(moment));
}

/** Whole units from a money field, as minor units. */
export function toMinor(value: FormDataEntryValue | null) {
	return Math.round(Number(String(value ?? "").replace(/[^\d.]/g, "")) * 100);
}

const busyWith = (formData: FormData | undefined, intent: string, id: string) => formData?.get("intent") === intent && formData?.get("id") === id;

/** Dates open for bids on a board, with a bid form for advertisers. */
export function AuctionCard({ auction, canBid, error }: { auction: Auction; canBid: boolean; error?: string | null }) {
	const navigation = useNavigation();
	const busy = busyWith(navigation.formData, "bid", auction.id);
	const minimum = auction.nextMinimumMinor ?? auction.reserveMinor;
	const mine = auction.myBid;

	return (
		<div className="panel space-y-4 p-5 sm:p-6">
			<div className="flex flex-wrap items-start justify-between gap-2">
				<h2 className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-ink-900">
					<Gavel className="h-5 w-5 text-brand-600" aria-hidden />
					Open for bids
				</h2>
				<Badge {...AUCTION_LABELS[auction.status]} />
			</div>
			<dl className="grid gap-2 text-sm sm:grid-cols-2">
				<div>
					<dt className="text-ink-500">Dates{auction.face ? ` on ${auction.face.label}` : ""}</dt>
					<dd className="font-semibold text-ink-900">{formatDays(auction)}</dd>
				</div>
				<div>
					<dt className="text-ink-500">{auction.open ? "Closes" : "Closed"}</dt>
					<dd className="font-semibold text-ink-900">{formatMoment(auction.closesAt)}</dd>
				</div>
				<div>
					<dt className="text-ink-500">Highest bid</dt>
					<dd className="font-display text-xl font-extrabold text-ink-900 tabular-nums">
						{auction.highestMinor !== null ? formatMoney(auction.highestMinor, auction.currency) : auction.format === "sealed" ? "Sealed until the close" : "No bids yet"}
					</dd>
				</div>
				<div>
					<dt className="text-ink-500">Reserve</dt>
					<dd className="font-semibold text-ink-900 tabular-nums">
						{formatMoney(auction.reserveMinor, auction.currency)} · {auction.bidCount} {auction.bidCount === 1 ? "bid" : "bids"}
					</dd>
				</div>
			</dl>

			{mine && (
				<p className="rounded-2xl bg-surface-100 px-4 py-3 text-sm text-ink-700">
					Your bid: <strong className="tabular-nums">{formatMoney(mine.amountMinor, auction.currency)}</strong>
					{mine.status === "won" && mine.bookingId ? (
						<>
							. You won.{" "}
							<Link to={`/bookings/${mine.bookingId}`} className="font-semibold text-brand-700 hover:underline">
								Pay to book the dates
							</Link>
						</>
					) : mine.status === "lapsed" ? (
						". It wasn't paid in time, so the dates went to the next bid."
					) : mine.leading ? (
						". You're the highest bidder."
					) : auction.open && auction.format === "open" ? (
						". Someone bid more."
					) : (
						"."
					)}
				</p>
			)}

			{auction.open &&
				(canBid ? (
					<Form method="post" preventScrollReset className="space-y-3">
						<input type="hidden" name="intent" value="bid" />
						<input type="hidden" name="id" value={auction.id} />
						<Field label="Your bid" hint={`At least ${formatMoney(minimum, auction.currency)}`}>
							<Input name="amount" type="number" min={minimum / 100} step="1000" defaultValue={minimum / 100} required />
						</Field>
						{error && <Alert>{error}</Alert>}
						<Button type="submit" className="w-full" disabled={busy}>
							{busy ? <Spinner /> : <Gavel className="h-4 w-4" aria-hidden />}
							{mine ? "Raise my bid" : "Place bid"}
						</Button>
						<p className="flex items-start gap-2 text-xs text-ink-500">
							<Timer className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />A bid in the last few minutes keeps bidding open a little longer. The winner has a day to pay.
						</p>
					</Form>
				) : (
					<Link prefetch="intent" to="/settings/roles" className={buttonClass("secondary", "w-full")}>
						Add the advertiser role to bid
					</Link>
				))}
		</div>
	);
}

/** For whoever looks after the board: open a face's dates to bids, and follow the auctions. */
export function AuctionsManager({ board, auctions, today }: { board: BoardDetail; auctions: Auction[]; today: string }) {
	const navigation = useNavigation();
	const busy = navigation.formData?.get("intent") === "open-auction";
	const unit = board.rate?.period ?? "month";

	return (
		<div className="panel space-y-4 p-5 sm:p-6">
			<div>
				<h2 className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-ink-900">
					<Gavel className="h-5 w-5 text-brand-600" aria-hidden />
					Bids
				</h2>
				<p className="mt-1 text-sm text-ink-500">Open some dates to bids instead of the fixed price. The highest bid at or over your reserve wins.</p>
			</div>

			{auctions.length > 0 && (
				<ul className="divide-y divide-surface-200 rounded-2xl bg-surface-100">
					{auctions.map((auction) => (
						<li key={auction.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
							<span className="space-y-1">
								<Badge {...AUCTION_LABELS[auction.status]} />
								<span className="block font-semibold text-ink-900">
									{formatDays(auction)}
									{auction.face && board.rateCard.length > 1 ? ` · ${auction.face.label}` : ""}
								</span>
								<span className="block text-ink-500 tabular-nums">
									{auction.highestMinor !== null ? `Highest ${formatMoney(auction.highestMinor, auction.currency)}` : "No amount shown yet"} · {auction.bidCount} {auction.bidCount === 1 ? "bid" : "bids"} ·{" "}
									{auction.open ? "closes" : "closed"} {formatMoment(auction.closesAt)}
								</span>
							</span>
							{auction.status === "open" && auction.bidCount === 0 && (
								<Form method="post" preventScrollReset>
									<input type="hidden" name="intent" value="cancel-auction" />
									<input type="hidden" name="id" value={auction.id} />
									<Button type="submit" variant="ghost" disabled={busyWith(navigation.formData, "cancel-auction", auction.id)}>
										<X className="h-4 w-4" aria-hidden />
										Close
									</Button>
								</Form>
							)}
						</li>
					))}
				</ul>
			)}

			<Form method="post" preventScrollReset className="space-y-3">
				<input type="hidden" name="intent" value="open-auction" />
				<div className="grid gap-3 sm:grid-cols-2">
					{board.rateCard.length > 1 && (
						<Field label="Which face">
							<Select name="faceId" defaultValue={board.rateCard[0]?.id}>
								{board.rateCard.map((face) => (
									<option key={face.id} value={face.id}>
										{face.label}
									</option>
								))}
							</Select>
						</Field>
					)}
					<Field label="First day">
						<Input type="date" name="startsOn" min={board.booking.earliestStart} required />
					</Field>
					<Field label="How long">
						<Select name="periods" defaultValue={1}>
							{Array.from({ length: board.booking.maxPeriods }, (_, index) => index + 1).map((count) => (
								<option key={count} value={count}>
									{count} {unit}
									{count === 1 ? "" : "s"}
								</option>
							))}
						</Select>
					</Field>
					<Field label="Reserve" hint="The least you'll take for the whole run">
						<Input type="number" name="reserve" min="1" step="1000" required />
					</Field>
					<Field label="Bidding closes">
						<Input type="datetime-local" name="closesAt" min={`${today}T00:00`} required />
					</Field>
				</div>
				<Button type="submit" variant="secondary" disabled={busy}>
					{busy ? <Spinner /> : <Gavel className="h-4 w-4" aria-hidden />}
					Open for bids
				</Button>
			</Form>
		</div>
	);
}

/** An offer in a list, with the answers the viewer can give. */
export function OfferRow({ offer, onBoards }: { offer: Offer; onBoards: boolean }) {
	const navigation = useNavigation();
	const [countering, setCountering] = useState(false);
	const busy = (intent: string) => busyWith(navigation.formData, intent, offer.id);
	const answer = (intent: string, label: string, Icon: typeof Check, variant: "primary" | "secondary" | "ghost" = "secondary") => (
		<Form method="post" preventScrollReset>
			<input type="hidden" name="intent" value={intent} />
			<input type="hidden" name="id" value={offer.id} />
			{!onBoards && <input type="hidden" name="mine" value="1" />}
			<Button type="submit" variant={variant} disabled={busy(intent)}>
				{busy(intent) ? <Spinner /> : <Icon className="h-4 w-4" aria-hidden />}
				{label}
			</Button>
		</Form>
	);

	return (
		<div className="panel space-y-3 p-3">
			<div className="flex gap-4">
				{offer.board && <BoardCover board={offer.board} className="w-32 shrink-0 !rounded-xl max-sm:w-24" />}
				<div className="flex min-w-0 flex-1 flex-col gap-1.5 py-1">
					<Badge {...OFFER_LABELS[offer.status]} />
					<Link prefetch="intent" to={`/boards/${offer.board?.id}`} className="truncate font-display text-lg font-extrabold tracking-tight text-ink-900 hover:text-brand-700">
						{offer.board?.name ?? "Board"}
					</Link>
					<p className="flex items-center gap-1.5 text-sm text-ink-500">
						<CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
						{formatDays(offer)}
						{offer.face ? ` · ${offer.face.label}` : ""}
					</p>
					{onBoards && offer.advertiser && <p className="text-sm text-ink-700">From {offer.advertiser.name}</p>}
					{offer.note && <p className="text-sm text-ink-500">“{offer.note}”</p>}
				</div>
				<div className="flex flex-col items-end justify-center gap-0.5 pr-2 text-right">
					<span className="font-display text-lg font-extrabold text-ink-900 tabular-nums">{formatMoney(offer.counterMinor ?? offer.amountMinor, offer.currency)}</span>
					<span className="text-xs text-ink-500 tabular-nums">{offer.counterMinor !== null ? `Offered ${formatMoney(offer.amountMinor, offer.currency)}` : `Listed ${formatMoney(offer.listMinor, offer.currency)}`}</span>
				</div>
			</div>

			{(offer.can.accept || offer.can.withdraw || offer.bookingId) && (
				<div className="flex flex-wrap items-center gap-2 border-t border-surface-200 pt-3">
					{offer.can.accept && answer("accept-offer", offer.status === "countered" ? "Accept the counter" : "Accept", Check, "primary")}
					{offer.can.counter && !countering && (
						<Button variant="secondary" onClick={() => setCountering(true)}>
							<HandCoins className="h-4 w-4" aria-hidden />
							Counter
						</Button>
					)}
					{offer.can.decline && answer("decline-offer", "Decline", X, "ghost")}
					{offer.can.withdraw && answer("withdraw-offer", "Withdraw", Undo2, "ghost")}
					{offer.bookingId && !onBoards && offer.status === "accepted" && (
						<Link prefetch="intent" to={`/bookings/${offer.bookingId}`} className={buttonClass("primary")}>
							Pay to book
						</Link>
					)}
					{(offer.status === "pending" || offer.status === "countered") && <span className="text-xs text-ink-500">Lapses {formatMoment(offer.expiresAt)}</span>}
				</div>
			)}

			{countering && (
				<Form method="post" preventScrollReset className="flex flex-wrap items-end gap-2" onSubmit={() => setCountering(false)}>
					<input type="hidden" name="intent" value="counter-offer" />
					<input type="hidden" name="id" value={offer.id} />
					<Field label="What you'd take">
						<Input name="amount" type="number" min={offer.amountMinor / 100 + 1} max={offer.listMinor / 100 - 1} step="1000" required />
					</Field>
					<Button type="submit">Send counter</Button>
					<Button variant="ghost" onClick={() => setCountering(false)}>
						Cancel
					</Button>
				</Form>
			)}
		</div>
	);
}

/** An auction the account bid on, in its list of bids. */
export function BidRow({ auction }: { auction: Auction }) {
	const mine = auction.myBid;

	return (
		<Link prefetch="intent" to={mine?.status === "won" && mine.bookingId ? `/bookings/${mine.bookingId}` : `/boards/${auction.board?.id}`} className="panel lift group flex gap-4 p-3">
			{auction.board && <BoardCover board={auction.board} className="w-32 shrink-0 !rounded-xl max-sm:w-24" />}
			<div className="flex min-w-0 flex-1 flex-col gap-1.5 py-1">
				<Badge
					{...(mine?.status === "won"
						? {
								label: auction.status === "sold" ? "Won and paid" : "You won, pay now",
								tone: "bg-emerald-50 text-available",
							}
						: AUCTION_LABELS[auction.status])}
				/>
				<h3 className="truncate font-display text-lg font-extrabold tracking-tight text-ink-900 group-hover:text-brand-700">{auction.board?.name ?? "Board"}</h3>
				<p className="flex items-center gap-1.5 text-sm text-ink-500">
					<CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
					{formatDays(auction)} · {auction.open ? "closes" : "closed"} {formatMoment(auction.closesAt)}
				</p>
			</div>
			<div className="flex flex-col items-end justify-center gap-0.5 pr-2 text-right">
				<span className="font-display text-lg font-extrabold text-ink-900 tabular-nums">{mine ? formatMoney(mine.amountMinor, auction.currency) : ""}</span>
				<span className="text-xs text-ink-500">{mine?.leading ? "Highest bid" : auction.highestMinor !== null ? `Highest ${formatMoney(auction.highestMinor, auction.currency)}` : "Your bid"}</span>
			</div>
		</Link>
	);
}
