import { redirect } from "react-router";
import { requireUser } from "~/lib/session.server";
import type { Route } from "./+types/checkout-complete";

/** Where the payment provider sends the payer back. Checks the payment, then shows the booking. */
export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireUser(request, context);
	const reference = new URL(request.url).searchParams.get("reference");

	if (!reference) throw redirect("/bookings");

	try {
		const { data: payment } = await api.verifyPayment(reference);
		const outcome = payment.status === "complete" ? "paid" : payment.status === "rejected" ? "failed" : "pending";

		throw redirect(`/bookings/${payment.bookingId}?payment=${outcome}`);
	} catch (error) {
		if (error instanceof Response) throw error;

		throw redirect("/bookings?payment=unknown");
	}
}
