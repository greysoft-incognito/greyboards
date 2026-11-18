import { redirect } from "react-router";
import type { ServerApi } from "./api.server";
import { toMinor } from "~/components/bids/BidBits";

const INTENTS = ["join-share", "takeover-bid", "pay-takeover"];

/**
 * Join a listed shared booking, bid for the whole board once its lock ended, or, having won,
 * pay for it. Joining goes on to the booking and paying to its checkout; a bid stays on the page.
 */
export async function sharedBookingAction(api: ServerApi, intent: string, bookingId: string, form: FormData) {
	if (intent === "join-share") {
		await api.joinShare(bookingId);

		throw redirect(`/bookings/${bookingId}`);
	}

	if (intent === "takeover-bid") {
		await api.bidToTake(bookingId, toMinor(form.get("amount")));

		return { error: null, message: "Bid placed for the whole board.", intent, id: bookingId };
	}

	const { data: payment } = await api.payTakeover(bookingId);

	throw redirect(payment.checkoutUrl ?? "/bookings?view=bids");
}

export const isSharedBookingIntent = (intent: string) => INTENTS.includes(intent);
