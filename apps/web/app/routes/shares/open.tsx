import { UsersRound } from "lucide-react";
import { BoardScene } from "~/components/BoardScene";
import { SharedBookingCard } from "~/components/bookings/SharedBookingCard";
import { Alert } from "~/components/ui";
import { formError } from "~/lib/api.server";
import { isSharedBookingIntent, sharedBookingAction } from "~/lib/shares.server";
import { requireUser } from "~/lib/session.server";
import { useToastMessage } from "~/lib/toast";
import type { Route } from "./+types/open";

export const meta = () => [{ title: "Shared boards · Greyboards" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api, user } = await requireUser(request, context);
	const shared = await api.openShares().then(({ data }) => data, () => null);
	const canJoin = user.accountRoles.some((role) => role.kind === "advertiser" && role.status === "active");

	return { shared, canJoin };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireUser(request, context);
	const form = await request.formData();
	const intent = String(form.get("intent"));

	try {
		if (isSharedBookingIntent(intent)) return await sharedBookingAction(api, intent, String(form.get("bookingId")), form);
	} catch (error) {
		if (error instanceof Response) throw error;

		return { error: formError(error).error, message: null };
	}

	return { error: "Something went wrong. Try again.", message: null };
}

/** Shared boards anyone can join before they're full, or bid for whole once their lock ends. */
export default function OpenShares({ loaderData, actionData }: Route.ComponentProps) {
	useToastMessage(actionData);

	const { shared, canJoin } = loaderData;

	return (
		<main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
			<h1 className="flex items-center gap-3 font-display text-3xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-4xl">
				<UsersRound className="h-8 w-8 text-brand-600" aria-hidden />
				Shared boards
			</h1>
			<p className="mt-1 max-w-2xl text-ink-500">Share a board with other advertisers for the same days and pay only your part. If shares are still unpaid when the lock ends, the whole board goes up for bids.</p>
			{actionData?.error && (
				<div className="mt-4">
					<Alert>{actionData.error}</Alert>
				</div>
			)}
			{shared === null ? (
				<p className="panel mt-6 px-6 py-8 text-center text-ink-700">Shared boards aren't listed right now.</p>
			) : shared.length ? (
				<div className="mt-6 grid gap-4 md:grid-cols-2">
					{shared.map((entry) => (
						<SharedBookingCard key={entry.id} shared={entry} showBoard canJoin={canJoin} />
					))}
				</div>
			) : (
				<div className="panel mt-6 overflow-hidden">
					<div className="h-44 sm:h-56">
						<BoardScene time="dusk" art="empty" headline="Nothing shared yet" />
					</div>
					<p className="px-6 py-8 text-center text-ink-700">When someone shares a board, it shows here until every share is taken.</p>
				</div>
			)}
		</main>
	);
}
