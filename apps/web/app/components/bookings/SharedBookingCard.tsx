import { Form, Link, useNavigation } from "react-router";
import { CreditCard, Lock, UsersRound } from "lucide-react";
import type { SharedBooking } from "@greyboards/types";
import { formatDay, formatMoney } from "./BookingBits";
import { Button, Spinner } from "~/components/ui";

/** "21 Nov, 4 PM" in Nigerian time. */
function moment(value: string) {
	return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "numeric", hour12: true, timeZone: "Africa/Lagos" }).format(new Date(value));
}

/**
 * A shared booking anyone can join: the days, what a share costs and how many are left. Once
 * its lock ends with shares unpaid, anyone can pay for the whole board instead.
 */
export function SharedBookingCard({ shared, showBoard = false, canJoin }: { shared: SharedBooking; showBoard?: boolean; canJoin: boolean }) {
	const navigation = useNavigation();
	const busy = navigation.formData?.get("bookingId") === shared.id ? navigation.formData.get("intent") : null;

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
				<Lock className="h-4 w-4 shrink-0 text-ink-500" aria-hidden />
				{shared.takeoverOpen
					? `No longer locked. Anyone can take the whole board for ${formatMoney(shared.amountMinor, shared.currency)}, and the sharers get their money back.`
					: `Kept for the sharers until ${moment(shared.lockedUntil)}. After that, someone can take the whole board if shares are still unpaid.`}
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
						{shared.takeoverOpen && (
							<Form method="post">
								<input type="hidden" name="intent" value="take-over" />
								<input type="hidden" name="bookingId" value={shared.id} />
								<Button type="submit" variant="secondary" disabled={!!busy}>
									{busy === "take-over" ? <Spinner /> : <CreditCard className="h-4 w-4" aria-hidden />}
									Take the whole board, {formatMoney(shared.amountMinor, shared.currency)}
								</Button>
							</Form>
						)}
					</div>
				)
			)}
		</div>
	);
}
