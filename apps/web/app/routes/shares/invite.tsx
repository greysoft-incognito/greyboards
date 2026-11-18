import { Form, Link, redirect, useNavigation } from "react-router";
import { CalendarDays, CreditCard, ShieldCheck, UsersRound } from "lucide-react";
import { BoardCover } from "~/components/boards/BoardBits";
import { formatDays, formatMoney } from "~/components/bookings/BookingBits";
import { formatWait } from "~/components/bookings/SharesPanel";
import { Alert, Button, buttonClass, Spinner } from "~/components/ui";
import { formError } from "~/lib/api.server";
import { requireUser } from "~/lib/session.server";
import type { Route } from "./+types/invite";

export const meta = () => [{ title: "Join a shared booking · Greyboards" }];

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const { api, user } = await requireUser(request, context);
	const { data: invite } = await api.shareInvite(params.token);
	const canBook = user.accountRoles.some((role) => role.kind === "advertiser" && role.status === "active");

	return { invite, canBook };
}

/** Take the share, then pay it on the provider's checkout. */
export async function action({ request, context, params }: Route.ActionArgs) {
	const { api } = await requireUser(request, context);
	const { data: invite } = await api.shareInvite(params.token);

	try {
		if (!invite.mine) await api.claimShare(params.token);

		const { data: payment } = await api.checkout(invite.booking.id);

		throw redirect(payment.checkoutUrl ?? `/bookings/${invite.booking.id}`);
	} catch (error) {
		if (error instanceof Response) throw error;

		return { error: formError(error).error };
	}
}

/** An invite to share a booking's cost: the board, the dates, and what this share costs. */
export default function ShareInvitePage({ loaderData, actionData }: Route.ComponentProps) {
	const { invite, canBook } = loaderData;
	const booking = invite.booking;
	const busy = useNavigation().state !== "idle";
	const left = invite.payBy ? Math.max(0, Math.floor((new Date(invite.payBy).getTime() - Date.now()) / 1000)) : 0;
	const payable = (invite.open || (invite.mine && invite.status === "claimed")) && left > 0;

	return (
		<main className="mx-auto max-w-xl px-4 py-6 sm:px-6 sm:py-10">
			<div className="panel space-y-5 p-5 sm:p-6">
				{booking.board && <BoardCover board={booking.board} className="rounded-2xl" />}
				<div>
					<p className="flex items-center gap-2 text-sm font-semibold text-brand-700">
						<UsersRound className="h-4 w-4" aria-hidden />
						{invite.organiser ?? "An advertiser"} is splitting this booking {invite.count} ways
					</p>
					<h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink-900">{booking.board?.name ?? "Board"}</h1>
					<p className="mt-1 flex items-center gap-2 text-sm text-ink-700">
						<CalendarDays className="h-4 w-4 text-ink-500" aria-hidden />
						{formatDays(booking)}
						{booking.face ? ` · ${booking.face.label}` : ""}
					</p>
				</div>
				<dl className="space-y-1.5 rounded-2xl bg-surface-100 px-4 py-3 text-sm">
					<div className="flex justify-between gap-4">
						<dt className="text-ink-700">Whole booking</dt>
						<dd className="text-ink-900 tabular-nums">{formatMoney(booking.amountMinor, booking.currency)}</dd>
					</div>
					<div className="flex items-baseline justify-between gap-4 border-t border-surface-200 pt-1.5">
						<dt className="font-semibold text-ink-900">This share</dt>
						<dd className="font-display text-xl font-extrabold text-ink-900 tabular-nums">{formatMoney(invite.amountMinor, invite.currency)}</dd>
					</div>
				</dl>

				{actionData?.error && <Alert>{actionData.error}</Alert>}

				{payable && canBook ? (
					<Form method="post" className="space-y-3">
						<Button type="submit" className="w-full" disabled={busy}>
							{busy ? <Spinner /> : <CreditCard className="h-4 w-4" aria-hidden />}
							{invite.mine ? "Pay my share" : "Join and pay my share"}
						</Button>
						<p className="flex items-start gap-2 text-xs text-ink-500">
							<ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-available" aria-hidden />
							Everyone has {formatWait(left)} to pay. If the booking doesn't go ahead, you'll get a full refund.
						</p>
					</Form>
				) : payable ? (
					<Link prefetch="intent" to="/settings/roles" className={buttonClass("primary", "w-full")}>
						Become an advertiser to join
					</Link>
				) : (
					<p className="text-sm text-ink-700">
						{invite.mine && invite.status === "paid"
							? "Your share is paid."
							: !invite.mine && invite.status !== "open"
								? "Someone already took this share."
								: "This booking is already closed."}{" "}
						{invite.mine && (
							<Link to={`/bookings/${booking.id}`} className="font-semibold text-brand-700 hover:underline">
								See the booking
							</Link>
						)}
					</p>
				)}
			</div>
		</main>
	);
}
