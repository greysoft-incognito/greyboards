import type { ServerApi } from "./api.server";
import { postedPhoto } from "./boards.server";

/** The ProofPanel's form intents. */
export const PROOF_INTENTS = ["add-proof", "remove-proof", "submit-proof", "accept-proof", "dispute-proof"] as const;

export function isProofIntent(intent: string): intent is (typeof PROOF_INTENTS)[number] {
	return (PROOF_INTENTS as readonly string[]).includes(intent);
}

/** Carries out a ProofPanel form on `bookingId`, from the booking's page or the print job's. */
export async function proofAction(api: ServerApi, bookingId: string, intent: (typeof PROOF_INTENTS)[number], form: FormData) {
	if (intent === "add-proof") {
		const photo = postedPhoto(form);
		const latitude = Number(form.get("latitude"));
		const longitude = Number(form.get("longitude"));

		if (!photo) return { error: "Choose a photo first.", message: null };
		if (!form.get("latitude") || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
			return { error: "We couldn't tell where you are. Allow location for this site, stand at the board and try again.", message: null };
		}

		await api.proofs.add(bookingId, photo, { latitude, longitude, accuracyM: Number(form.get("accuracyM")) || null, takenAt: new Date().toISOString() });

		return { error: null, message: "Photo added." };
	}

	if (intent === "remove-proof") {
		await api.proofs.remove(bookingId, String(form.get("photo")));

		return { error: null, message: "Photo removed." };
	}

	if (intent === "submit-proof") {
		await api.proofs.submit(bookingId);

		return { error: null, message: "Sent to the advertiser to check." };
	}

	if (intent === "accept-proof") {
		await api.proofs.accept(bookingId);

		return { error: null, message: "Accepted. Your ad is live and everyone is paid." };
	}

	await api.proofs.dispute(bookingId, String(form.get("note") ?? ""));

	return { error: null, message: "Sent back with your note." };
}
