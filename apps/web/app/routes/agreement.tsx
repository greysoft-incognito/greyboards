import { useState } from "react";
import { data, Form, useNavigation } from "react-router";
import { BadgeCheck, Banknote, CircleX, Layers, Lightbulb, MapPin, MessageSquareText, PenLine, Ruler } from "lucide-react";
import type { AgreementOffer } from "@greyboards/types";
import { BoardCover, formatRate, formatSize } from "~/components/boards/BoardBits";
import { Avatar } from "~/components/Avatar";
import { Alert, Button, Field, Input, OtpInput, Spinner } from "~/components/ui";
import { formError, getServerApi } from "~/lib/api.server";
import { cloudflareContext } from "~/lib/cloudflare";
import type { Route } from "./+types/agreement";

export const meta = () => [{ title: "Your board agreement · Greyboards" }, { name: "robots", content: "noindex" }];

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	const api = await getServerApi(request, env, null);

	try {
		return { offer: (await api.agreements.show(params.token)).data };
	} catch (error) {
		throw data(formError(error).error, { status: 404 });
	}
}

export async function action({ request, context, params }: Route.ActionArgs) {
	const { env } = context.get(cloudflareContext);
	const api = await getServerApi(request, env, null);
	const form = await request.formData();
	const intent = String(form.get("intent"));

	try {
		if (intent === "code") {
			await api.agreements.sendCode(params.token);

			return { intent, codeSent: true, error: null, fieldErrors: {} as Record<string, string> };
		}

		if (intent === "decline") {
			await api.agreements.decline(params.token);

			return { intent, codeSent: false, error: null, fieldErrors: {} as Record<string, string> };
		}

		await api.agreements.sign(params.token, { name: String(form.get("name") ?? ""), code: String(form.get("code") ?? "") });

		return { intent, codeSent: false, error: null, fieldErrors: {} as Record<string, string> };
	} catch (error) {
		const result = formError(error);

		return { intent, codeSent: intent !== "decline", error: result.error, fieldErrors: result.fieldErrors };
	}
}

/**
 * What a board owner opens from the SMS a scout sent: the board, the terms, and a way to
 * sign with a texted code. Most owners have no account, so none is needed.
 */
export default function Agreement({ loaderData, actionData }: Route.ComponentProps) {
	const { offer } = loaderData;
	const { board } = offer;
	const rate = formatRate(offer.rate);

	return (
		<main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
			<div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
				<section className="space-y-4">
					<div className="relative">
						<BoardCover board={{ ...board, coverUrl: board.coverUrl }} className="rounded-[1.75rem] shadow-[0_16px_36px_rgba(30,31,34,0.18)]" />
						{offer.scout && (
							<div className="glass absolute bottom-3 left-3 flex items-center gap-2.5 rounded-full py-1.5 pr-4 pl-1.5">
								<Avatar user={offer.scout} />
								<span className="text-sm text-ink-900">
									Tagged by <strong>{offer.scout.name}</strong>
								</span>
							</div>
						)}
					</div>
					<div className="panel space-y-3 p-5 sm:p-6">
						<h1 className="font-display text-3xl leading-tight font-extrabold tracking-[-0.03em] text-ink-900">{board.name}</h1>
						<p className="flex items-center gap-2 text-sm text-ink-500">
							<MapPin className="h-4 w-4 shrink-0" aria-hidden />
							{[board.address, board.city].filter(Boolean).join(", ") || `${board.latitude.toFixed(5)}, ${board.longitude.toFixed(5)}`}
						</p>
						<ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-700">
							<li className="flex items-center gap-2">
								<Ruler className="h-4 w-4 text-ink-500" aria-hidden />
								{board.kindLabel}, {formatSize(board)}
							</li>
							<li className="flex items-center gap-2">
								<Layers className="h-4 w-4 text-ink-500" aria-hidden />
								{board.faces === 1 ? "One face" : `${board.faces} faces`}
							</li>
							<li className="flex items-center gap-2">
								<Lightbulb className="h-4 w-4 text-ink-500" aria-hidden />
								{board.lit ? "Lit at night" : "Not lit"}
							</li>
						</ul>
					</div>
				</section>

				<section className="space-y-4">
					<div className="bg-brand-sweep rounded-[1.75rem] p-6 text-white shadow-[0_16px_36px_rgba(88,38,52,0.35)] sm:p-7">
						<p className="text-sm text-brand-100">{offer.ownerName ? `For ${offer.ownerName}` : "For the board's owner"}</p>
						<h2 className="mt-1 font-display text-3xl font-extrabold tracking-[-0.03em]">Let Greyboards find advertisers for your board</h2>
						<div className="mt-5 flex items-end gap-3">
							<span className="font-display text-6xl leading-none font-extrabold tabular-nums">{offer.ownerSharePercent}%</span>
							<span className="pb-1 text-brand-100">of every booking is yours</span>
						</div>
						{rate && (
							<p className="mt-4 flex items-center gap-2 text-sm text-brand-100">
								<Banknote className="h-4 w-4" aria-hidden />
								Listed at {rate}
							</p>
						)}
					</div>

					<div className="panel space-y-3 p-5 text-sm text-ink-700 sm:p-6">
						<h3 className="font-display text-lg font-extrabold tracking-tight text-ink-900">What you agree to</h3>
						<ul className="list-disc space-y-1.5 pl-5">
							<li>{offer.scout?.name ?? "The scout"} looks after bookings, printing and posting on this board for you.</li>
							<li>You get {offer.ownerSharePercent}% of what each advertiser pays, sent to you after the ad goes up.</li>
							<li>You can stop at any time once current bookings end. Text or call us and we'll take the board off Greyboards.</li>
						</ul>
					</div>

					<Signing offer={offer} result={actionData} />
				</section>
			</div>
		</main>
	);
}

type SigningResult = { intent: string; codeSent: boolean; error: string | null; fieldErrors: Record<string, string> } | undefined;

function Signing({ offer, result }: { offer: AgreementOffer; result: SigningResult }) {
	const navigation = useNavigation();
	const busy = (intent: string) => navigation.state !== "idle" && navigation.formData?.get("intent") === intent;
	const [name, setName] = useState(offer.ownerName ?? "");
	const codeSent = result?.codeSent ?? false;

	if (offer.status === "signed") {
		return (
			<div className="panel flex items-start gap-3 p-5 sm:p-6">
				<BadgeCheck className="mt-0.5 h-6 w-6 shrink-0 text-available" aria-hidden />
				<div>
					<p className="font-display text-lg font-extrabold text-ink-900">Signed{offer.signedName ? ` by ${offer.signedName}` : ""}</p>
					<p className="text-sm text-ink-500">Thank you. We'll text you when your board gets its first booking.</p>
				</div>
			</div>
		);
	}

	if (offer.status !== "sent") {
		const notes = { declined: "You declined, so we won't list this board.", cancelled: "A newer link replaced this one. Use the latest text we sent.", expired: "This link ran out. Ask the scout to send a new one." };

		return (
			<div className="panel flex items-start gap-3 p-5 sm:p-6">
				<CircleX className="mt-0.5 h-6 w-6 shrink-0 text-ink-500" aria-hidden />
				<p className="text-sm text-ink-700">{notes[offer.status as keyof typeof notes]}</p>
			</div>
		);
	}

	return (
		<div className="panel space-y-4 p-5 sm:p-6">
			{result?.error && <Alert>{result.error}</Alert>}
			{!codeSent ? (
				<>
					<p className="text-sm text-ink-700">To sign, we'll text a code to {offer.ownerPhone}.</p>
					<Form method="post" className="flex flex-wrap gap-2">
						<input type="hidden" name="intent" value="code" />
						<Button type="submit" disabled={busy("code")}>
							{busy("code") ? <Spinner /> : <MessageSquareText className="h-4 w-4" aria-hidden />}
							Text me a code
						</Button>
					</Form>
				</>
			) : (
				<Form method="post" className="space-y-4">
					<input type="hidden" name="intent" value="sign" />
					<Field label="Your full name" error={result?.fieldErrors.name} hint="As you'd sign it.">
						<Input name="name" required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
					</Field>
					<div>
						<span className="mb-1.5 block text-sm font-semibold text-ink-900">Code we texted to {offer.ownerPhone}</span>
						<OtpInput name="code" invalid={!!result?.error && result.intent === "sign"} disabled={busy("sign") || name.trim().length < 2} />
					</div>
					<Button type="submit" disabled={busy("sign")} className="w-full">
						{busy("sign") ? <Spinner /> : <PenLine className="h-4 w-4" aria-hidden />}
						Sign the agreement
					</Button>
				</Form>
			)}
			<Form method="post" className="border-t border-surface-200 pt-3">
				<input type="hidden" name="intent" value="decline" />
				<button type="submit" className="text-sm font-medium text-ink-500 hover:text-red-700" disabled={busy("decline")}>
					Not interested? Decline
				</button>
			</Form>
		</div>
	);
}
