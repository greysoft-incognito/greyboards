import { useState } from "react";
import { Form, useNavigation } from "react-router";
import { Check, Copy, CreditCard, Gavel, HandCoins, UsersRound, X } from "lucide-react";
import type { Booking, BookingShare, ShareStatus } from "@greyboards/types";
import { formatMoney } from "./BookingBits";
import { Button, Spinner } from "~/components/ui";

const STATUS: Record<ShareStatus, { label: string; tone: string }> = {
	open: { label: "Waiting for someone", tone: "bg-surface-100 text-ink-500" },
	claimed: { label: "Not paid yet", tone: "bg-amber-50 text-held" },
	paid: { label: "Paid", tone: "bg-emerald-50 text-available" },
	refunded: { label: "Refunded", tone: "bg-surface-100 text-ink-500" },
};

/** "2 days 4 hours" or "35 minutes" until the hold runs out. */
export function formatWait(seconds: number) {
	const hours = Math.floor(seconds / 3600);

	if (hours >= 24) return `${Math.floor(hours / 24)} days ${hours % 24} hours`;
	if (hours >= 1) return `${hours} hours ${Math.floor((seconds % 3600) / 60)} minutes`;

	return `${Math.max(1, Math.ceil(seconds / 60))} minutes`;
}

/**
 * A shared booking's shares: who holds each, who paid, and the invite links for the open
 * ones. Everyone pays their own share; the organiser can cover the rest or let it go.
 */
export function SharesPanel({ booking, isOrganiser }: { booking: Booking; isOrganiser: boolean }) {
	const navigation = useNavigation();
	const intent = navigation.formData?.get("intent");
	const shares = booking.shares ?? [];
	const due = shares.filter((share) => share.mine && share.status === "claimed").reduce((sum, share) => sum + share.amountMinor, 0);
	const unpaid = shares.filter((share) => !share.mine && (share.status === "open" || share.status === "claimed")).length;
	const held = booking.status === "held" && (booking.holdSecondsLeft ?? 0) > 0;

	return (
		<div className="space-y-3">
			<p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
				<UsersRound className="h-4 w-4 text-brand-600" aria-hidden />
				Split {shares.length} ways
			</p>
			<ul className="divide-y divide-surface-200 rounded-2xl bg-surface-100">
				{shares.map((share) => (
					<ShareLine key={share.id} share={share} currency={booking.currency} />
				))}
			</ul>
			{held && (
				<p className="text-sm text-ink-700">
					The dates stay held for {formatWait(booking.holdSecondsLeft ?? 0)}. If a share is still unpaid then, the booking lapses and everyone who paid gets their money back.
				</p>
			)}
			{held && (booking.sharing?.auction || booking.sharing?.takeoverOpen) && (
				<p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-held">
					<Gavel className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
					{booking.sharing.auction
						? `Someone is bidding for the whole board (${booking.sharing.auction.bidCount} ${booking.sharing.auction.bidCount === 1 ? "bid" : "bids"}). Pay every share before the winner pays to keep it; otherwise everyone who paid gets their money back.`
						: "The lock has ended, so anyone can now bid for the whole board. Pay every share to keep it."}
				</p>
			)}
			{held && (
				<div className="flex flex-wrap gap-2">
					{due > 0 && (
						<Form method="post">
							<input type="hidden" name="intent" value="pay" />
							<Button type="submit" disabled={!!intent}>
								{intent === "pay" ? <Spinner /> : <CreditCard className="h-4 w-4" aria-hidden />}
								Pay {isOrganiser && shares.filter((share) => share.mine && share.status === "claimed").length > 1 ? "my shares" : "my share"}, {formatMoney(due, booking.currency)}
							</Button>
						</Form>
					)}
					{isOrganiser && unpaid > 0 && (
						<Form method="post">
							<input type="hidden" name="intent" value="cover-shares" />
							<Button type="submit" variant="secondary" disabled={!!intent}>
								{intent === "cover-shares" ? <Spinner /> : <HandCoins className="h-4 w-4" aria-hidden />}
								Cover the {unpaid === 1 ? "unpaid share" : `${unpaid} unpaid shares`}
							</Button>
						</Form>
					)}
					{isOrganiser && (
						<Form method="post">
							<input type="hidden" name="intent" value="cancel" />
							<Button type="submit" variant="ghost" disabled={!!intent}>
								<X className="h-4 w-4" aria-hidden />
								Let it go
							</Button>
						</Form>
					)}
				</div>
			)}
		</div>
	);
}

function ShareLine({ share, currency }: { share: BookingShare; currency: string }) {
	const [copied, setCopied] = useState(false);
	const look = STATUS[share.status];

	const copy = async () => {
		await navigator.clipboard?.writeText(share.inviteUrl ?? "").catch(() => undefined);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<li className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm">
			<span>
				<span className="font-semibold text-ink-900">
					{share.mine ? "You" : (share.holder ?? `Share ${share.position}`)} · <span className="tabular-nums">{formatMoney(share.amountMinor, currency)}</span>
				</span>
				<span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${look.tone}`}>{look.label}</span>
			</span>
			{share.inviteUrl && (
				<button type="button" onClick={copy} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-white">
					{copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
					{copied ? "Link copied" : "Copy invite link"}
				</button>
			)}
		</li>
	);
}
