import { redirect } from "react-router";
import type { ServerApi } from "./api.server";

/** Join a listed shared booking, or pay to take the whole board. Both go on to the booking or its checkout. */
export async function sharedBookingAction(api: ServerApi, intent: string, bookingId: string) {
	if (intent === "join-share") {
		await api.joinShare(bookingId);

		throw redirect(`/bookings/${bookingId}`);
	}

	const { data: payment } = await api.takeOver(bookingId);

	throw redirect(payment.checkoutUrl ?? `/bookings/${bookingId}`);
}

export const isSharedBookingIntent = (intent: string) => intent === "join-share" || intent === "take-over";
