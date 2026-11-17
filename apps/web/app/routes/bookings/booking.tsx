import { useEffect, useState } from "react";
import { Form, Link, redirect, useNavigation, useSearchParams } from "react-router";
import { ArrowLeft, BadgeCheck, CalendarDays, Camera, CreditCard, Image, Printer, ShieldCheck, Undo2, Wallet, X } from "lucide-react";
import type { Booking } from "@greyboards/types";
import { BoardCover, formatRate } from "~/components/boards/BoardBits";
import { ArtworkPanel } from "~/components/bookings/ArtworkPanel";
import { ProofPanel } from "~/components/proofs/ProofPanel";
import { MessagesPanel } from "~/components/bookings/MessagesPanel";
import { SharesPanel } from "~/components/bookings/SharesPanel";
import { BookingStatusBadge, formatDays, formatMoney } from "~/components/bookings/BookingBits";
import { Alert, Button, Input, Spinner } from "~/components/ui";
import { formError } from "~/lib/api.server";
import { postedPhoto } from "~/lib/boards.server";
import { isProofIntent, proofAction } from "~/lib/proofs.server";
import { requireUser } from "~/lib/session.server";
import { toast, useToastMessage } from "~/lib/toast";
import type { Route } from "./+types/booking";

export const meta = ({ loaderData }: Route.MetaArgs) => [{ title: `${loaderData?.booking.board?.name ?? "Booking"} · Bookings · Greyboards` }];

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const { api, user } = await requireUser(request, context);
	const { data: booking } = await api.booking(params.id);
	const messages = await api.messages(params.id, { per_page: 30 }).catch(() => null);

	return { booking, messages: messages?.data ?? [], moreMessages: (messages?.meta.last_page ?? 1) > 1, isAdvertiser: booking.advertiserId === user.id, canRefund: user.permissions.includes("payouts.manage") };
}

export async function action({ request, context, params }: Route.ActionArgs) {
	const { api } = await requireUser(request, context);
	const form = await request.formData();
	const intent = String(form.get("intent"));

	try {
		if (intent === "pay") {
			const { data: payment } = await api.checkout(params.id);

			throw redirect(payment.checkoutUrl ?? `/bookings/${params.id}`);
		}

		if (intent === "message") {
			const body = String(form.get("body") ?? "").trim();
			const photo = postedPhoto(form);

			if (!body && !photo) return { error: "Write a message or add a photo.", message: null };

			await api.sendMessage(params.id, body || null, photo);

			return { error: null, message: null };
		}

		if (intent === "cover-shares") {
			const response = await api.coverShares(params.id);

			return { error: null, message: response.message ?? "The unpaid shares are yours to pay." };
		}

		if (intent === "cancel") {
			const response = await api.cancelBooking(params.id);

			return { error: null, message: response.message ?? "Booking cancelled. The dates are free again." };
		}

		if (intent === "refund") {
			await api.admin.refundBooking(params.id, { reason: String(form.get("reason") ?? "") });

			return { error: null, message: "Booking cancelled and refunded in full." };
		}

		if (intent === "artwork") {
			const artwork = postedPhoto(form, "artwork");

			if (!artwork) return { error: "Choose the artwork first.", message: null };

			await api.uploadArtwork(params.id, artwork);

			return { error: null, message: "Artwork sent for checking." };
		}

		if (intent === "approve" || intent === "reject") {
			await api.reviewArtwork(params.id, { decision: intent, note: String(form.get("note") ?? "") || undefined });

			return { error: null, message: intent === "approve" ? "Approved. It goes to a billposter next." : "Sent back with your note." };
		}

		if (isProofIntent(intent)) return await proofAction(api, params.id, intent, form);
	} catch (error) {
		if (error instanceof Response) throw error;

		return { error: formError(error).error, message: null };
	}

	return { error: "Something went wrong. Try again.", message: null };
}

/** The steps from payment to the owner being paid. Each lights up once the booking gets there. */
const STEPS: { label: string; detail: string | ((booking: Booking) => string); icon: typeof CreditCard; done: (booking: Booking) => boolean }[] = [
	{ label: "Paid", detail: "Your money waits in escrow.", icon: CreditCard, done: (booking) => ["paid", "live", "completed"].includes(booking.status) },
	{ label: "Artwork approved", detail: "The owner checks your design fits the board.", icon: Image, done: (booking) => booking.artwork?.status === "approved" || isLive(booking) },
	{ label: "Printed and posted", detail: (booking) => (booking.printedBy === "owner" ? "The board's owner prints it and puts it up." : "A billposter prints it and puts it up."), icon: Printer, done: (booking) => booking.printJob?.status === "posted" || (!!booking.proof && booking.proof.status !== "none") || isLive(booking) },
	{ label: "Proof accepted", detail: "Geotagged photos show your ad on the board.", icon: Camera, done: (booking) => booking.proof?.status === "accepted" || isLive(booking) },
	{ label: "Everyone paid", detail: "Only then does the money leave escrow.", icon: Wallet, done: (booking) => !!booking.releasedAt },
];

function isLive(booking: Booking) {
	return booking.status === "live" || booking.status === "completed";
}

/** One booking: the board, the days, the money, and what happens next. */
export default function BookingPage({ loaderData, actionData }: Route.ComponentProps) {
	useToastMessage(actionData);

	const { booking, messages, moreMessages, isAdvertiser, canRefund } = loaderData;
	const [params] = useSearchParams();
	const outcome = params.get("payment");

	useEffect(() => {
		if (outcome === "paid") toast.success("Payment received. Your dates are booked.", { id: "paid" });
	}, [outcome]);

	return (
		<main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
			<Link prefetch="intent" to="/bookings" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-ink-900">
				<ArrowLeft className="h-4 w-4" aria-hidden />
				Bookings
			</Link>

			<div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
				<section className="space-y-4">
					<div className="panel space-y-4 p-5 sm:p-6">
						<BookingStatusBadge status={booking.status} />
						<h1 className="font-display text-3xl leading-tight font-extrabold tracking-[-0.03em] text-ink-900">{booking.board?.name ?? "Board"}</h1>
						<p className="flex items-center gap-2 text-ink-700">
							<CalendarDays className="h-5 w-5 shrink-0 text-ink-500" aria-hidden />
							{formatDays(booking)}
						</p>
						<dl className="space-y-2 rounded-2xl bg-surface-100 p-4 text-sm">
							<div className="flex justify-between gap-4">
								<dt className="text-ink-500">Rate</dt>
								<dd className="text-ink-900">{formatRate(booking.rate)}</dd>
							</div>
							<div className="flex justify-between gap-4">
								<dt className="text-ink-500">Length</dt>
								<dd className="text-ink-900">
									{booking.periods} {booking.rate.period}
									{booking.periods === 1 ? "" : "s"}
								</dd>
							</div>
							{booking.printFeeMinor > 0 && (
								<div className="flex justify-between gap-4">
									<dt className="text-ink-500">Printing and posting</dt>
									<dd className="text-ink-900 tabular-nums">{formatMoney(booking.printFeeMinor, booking.currency)}</dd>
								</div>
							)}
							<div className="flex justify-between gap-4 border-t border-surface-200 pt-2">
								<dt className="font-semibold text-ink-900">Total</dt>
								<dd className="font-display text-lg font-extrabold text-ink-900 tabular-nums">{formatMoney(booking.amountMinor, booking.currency)}</dd>
							</div>
						</dl>
						{outcome === "failed" && <Alert>The payment didn't go through, so nothing was charged. Try again while your dates are held.</Alert>}
						{outcome === "pending" && <Alert>Your payment is still being confirmed. Refresh in a moment.</Alert>}
						{actionData?.error && <Alert>{actionData.error}</Alert>}
						{isAdvertiser && booking.status === "held" && !booking.shared && <PayOrCancel booking={booking} />}
						{booking.shared && booking.shares && <SharesPanel booking={booking} isOrganiser={isAdvertiser} />}
						{booking.split && <Split booking={booking} />}
					</div>
					{booking.artwork && ["paid", "live", "completed"].includes(booking.status) && <ArtworkPanel booking={booking} isAdvertiser={isAdvertiser} />}
					{booking.proof && booking.artwork?.status === "approved" && <ProofPanel proof={booking.proof} />}
					{booking.cancellation?.allowed && <CancelPaid booking={booking} />}
					{canRefund && booking.status === "paid" && <StaffRefund booking={booking} />}
					{!!booking.refunds?.length && <Refunds booking={booking} />}
				</section>

				<section className="space-y-4">
					{booking.board && (
						<Link prefetch="intent" to={`/boards/${booking.board.id}`} className="panel lift block p-3">
							<BoardCover board={booking.board} />
							<p className="px-1 pt-3 pb-1 text-sm font-semibold text-brand-700">See the board</p>
						</Link>
					)}
					{["paid", "live", "completed"].includes(booking.status) && <Steps booking={booking} />}
					<MessagesPanel messages={messages} more={moreMessages} />
				</section>
			</div>
		</main>
	);
}

/** Pay before the hold runs out, or let the dates go. */
function PayOrCancel({ booking }: { booking: Booking }) {
	const navigation = useNavigation();
	const intent = navigation.formData?.get("intent");
	const [left, setLeft] = useState(booking.holdSecondsLeft ?? 0);

	useEffect(() => {
		const timer = setInterval(() => setLeft((seconds) => Math.max(0, seconds - 1)), 1000);

		return () => clearInterval(timer);
	}, []);

	const minutes = Math.floor(left / 60);
	const seconds = String(left % 60).padStart(2, "0");

	return (
		<div className="space-y-3">
			<p className="text-sm text-ink-700" aria-live="polite">
				{left > 0 ? `We're holding these dates for you for ${minutes}:${seconds}.` : "The hold ran out. Book the dates again."}
			</p>
			<div className="flex flex-wrap gap-2">
				<Form method="post">
					<input type="hidden" name="intent" value="pay" />
					<Button type="submit" disabled={!!intent || left <= 0}>
						{intent === "pay" ? <Spinner /> : <CreditCard className="h-4 w-4" aria-hidden />}
						Pay {formatMoney(booking.amountMinor, booking.currency)}
					</Button>
				</Form>
				<Form method="post">
					<input type="hidden" name="intent" value="cancel" />
					<Button type="submit" variant="ghost" disabled={!!intent}>
						<X className="h-4 w-4" aria-hidden />
						Cancel
					</Button>
				</Form>
			</div>
		</div>
	);
}

/** The advertiser cancels a paid booking, seeing first what they get back. */
function CancelPaid({ booking }: { booking: Booking }) {
	const quote = booking.cancellation!;
	const [open, setOpen] = useState(false);
	const busy = useNavigation().formData?.get("intent") === "cancel";

	return (
		<div className="panel space-y-3 p-5 sm:p-6">
			<h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900">Change of plans?</h2>
			<p className="text-sm text-ink-700">
				{booking.shared
					? `Cancel now and ${formatMoney(quote.refundMinor, booking.currency)} goes back, split between everyone who paid by what they paid.`
					: quote.full
					? `Cancel now and you get all ${formatMoney(quote.refundMinor, booking.currency)} back.`
					: `It's close to the start, so cancelling now gives back ${formatMoney(quote.refundMinor, booking.currency)} of the ${formatMoney(booking.amountMinor, booking.currency)} you paid. The rest goes to the owner.`}
			</p>
			{open ? (
				<Form method="post" className="flex flex-wrap gap-2">
					<input type="hidden" name="intent" value="cancel" />
					<Button type="submit" variant="danger" disabled={busy}>
						{busy ? <Spinner /> : <X className="h-4 w-4" aria-hidden />}
						Cancel and refund {formatMoney(quote.refundMinor, booking.currency)}
					</Button>
					<Button variant="ghost" onClick={() => setOpen(false)}>
						Keep the booking
					</Button>
				</Form>
			) : (
				<Button variant="secondary" onClick={() => setOpen(true)}>
					Cancel booking
				</Button>
			)}
		</div>
	);
}

/** Staff cancel a paid booking and give all the money back. */
function StaffRefund({ booking }: { booking: Booking }) {
	const busy = useNavigation().formData?.get("intent") === "refund";

	return (
		<Form method="post" className="panel space-y-3 p-5 sm:p-6">
			<input type="hidden" name="intent" value="refund" />
			<h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900">Refund in full</h2>
			<p className="text-sm text-ink-500">Staff only. Cancels the booking, frees the dates and sends all {formatMoney(booking.amountMinor, booking.currency)} back to the advertiser.</p>
			<Input name="reason" required minLength={5} maxLength={191} placeholder="Why, such as: the board was taken down" aria-label="Reason" />
			<Button type="submit" variant="danger" disabled={busy}>
				{busy ? <Spinner /> : <Undo2 className="h-4 w-4" aria-hidden />}
				Cancel and refund
			</Button>
		</Form>
	);
}

const REFUND_STATUS = { processing: "On its way back", refunded: "Refunded", failed: "Refund failed, our team is on it" } as const;

function Refunds({ booking }: { booking: Booking }) {
	return (
		<div className="panel space-y-3 p-5 sm:p-6">
			<h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900">Refunds</h2>
			<ul className="divide-y divide-surface-200 text-sm">
				{booking.refunds!.map((refund) => (
					<li key={refund.createdAt} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
						<span>
							<span className="block font-semibold text-ink-900">{REFUND_STATUS[refund.status]}</span>
							<span className="text-ink-500">{refund.reason}</span>
						</span>
						<span className="font-display font-extrabold text-ink-900 tabular-nums">{formatMoney(refund.amountMinor, refund.currency)}</span>
					</li>
				))}
			</ul>
		</div>
	);
}

/** Who gets what once the ad is up, for whoever looks after the board. */
function Split({ booking }: { booking: Booking }) {
	const split = booking.split!;
	const rows = [
		{ label: `Owner (${split.ownerSharePercent}%)`, amount: split.ownerAmountMinor },
		...(split.scoutAmountMinor ? [{ label: "Scout", amount: split.scoutAmountMinor }] : []),
		...(booking.printFeeMinor ? [{ label: booking.printedBy === "owner" ? "Printing, by the owner's side" : "Billposter, for printing", amount: booking.printFeeMinor }] : []),
		{ label: "Greyboards", amount: split.platformAmountMinor },
	];

	return (
		<div className="border-t border-surface-200 pt-4">
			<p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
				<ShieldCheck className="h-4 w-4 text-available" aria-hidden />
				{booking.releasedAt ? "Released from escrow" : "Paid out once the ad is up"}
			</p>
			<dl className="mt-2 space-y-1 text-sm">
				{rows.map((row) => (
					<div key={row.label} className="flex justify-between gap-4">
						<dt className="text-ink-500">{row.label}</dt>
						<dd className="text-ink-900 tabular-nums">{formatMoney(row.amount, booking.currency)}</dd>
					</div>
				))}
			</dl>
		</div>
	);
}

/** What happens between payment and the owner being paid. */
function Steps({ booking }: { booking: Booking }) {
	return (
		<ol className="panel space-y-4 p-5 sm:p-6">
			{STEPS.map((step) => {
				const done = step.done(booking);

				return (
					<li key={step.label} className="flex gap-3">
						<span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${done ? "bg-brand-500 text-white" : "bg-surface-100 text-ink-500"}`}>
							{done ? <BadgeCheck className="h-4 w-4" aria-hidden /> : <step.icon className="h-4 w-4" aria-hidden />}
						</span>
						<span>
							<span className={`block font-semibold ${done ? "text-ink-900" : "text-ink-700"}`}>{step.label}</span>
							<span className="block text-sm text-ink-500">{typeof step.detail === "function" ? step.detail(booking) : step.detail}</span>
						</span>
					</li>
				);
			})}
		</ol>
	);
}
