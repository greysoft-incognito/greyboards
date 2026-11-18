import { useEffect, useState } from "react";
import { Form, Link, useNavigation } from "react-router";
import { ArrowLeft, CalendarClock, Camera, CheckCircle2, Download, ExternalLink, Hand, MapPin, Navigation, Ruler, Undo2 } from "lucide-react";
import type { PrintJob } from "@greyboards/types";
import { BoardCover, formatSize, mapLink } from "~/components/boards/BoardBits";
import { formatDay, formatDays, formatMoney } from "~/components/bookings/BookingBits";
import { JobStatusBadge, boardPlace, formatDistance } from "~/components/jobs/JobBits";
import { SendPrice } from "~/components/jobs/PrintOffers";
import { ProofPanel } from "~/components/proofs/ProofPanel";
import { Alert, Button, Spinner } from "~/components/ui";
import { formError } from "~/lib/api.server";
import { postedPhoto } from "~/lib/boards.server";
import { isProofIntent, proofAction } from "~/lib/proofs.server";
import { requireUser } from "~/lib/session.server";
import { useToastMessage } from "~/lib/toast";
import type { Route } from "./+types/job";

export const meta = ({ loaderData }: Route.MetaArgs) => [{ title: `${loaderData?.job.board?.name ?? "Job"} · Print jobs · Greyboards` }];

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const { api } = await requireUser(request, context);
	const { data: job } = await api.printJobs.show(params.id);

	return { job };
}

export async function action({ request, context, params }: Route.ActionArgs) {
	const { api } = await requireUser(request, context);
	const form = await request.formData();
	const intent = String(form.get("intent"));

	try {
		if (intent === "send-price") {
			const amount = Number(String(form.get("amount") ?? "").replace(/[^\d.]/g, ""));

			if (!amount) return { error: null, message: null, fieldErrors: { amount: "Enter your price in naira." } };

			await api.printJobs.sendPrice(params.id, Math.round(amount * 100), String(form.get("note") ?? "").trim() || null);

			return { error: null, message: "Price sent. The job is yours if the advertiser pays it." };
		}

		if (intent === "withdraw-price" || intent === "accept-request" || intent === "decline-request") {
			const { data: job } = await api.printJobs.show(params.id);

			if (!job.myOffer) return { error: "That price or request isn't open any more.", message: null };
			if (intent === "withdraw-price") await api.printJobs.withdrawPrice(job.myOffer.id);
			if (intent === "accept-request") await api.printJobs.acceptRequest(job.myOffer.id);
			if (intent === "decline-request") await api.printJobs.declineRequest(job.myOffer.id);

			return { error: null, message: intent === "withdraw-price" ? "Price taken back." : intent === "accept-request" ? "Accepted. The job is yours once the advertiser pays." : "Request declined." };
		}

		if (intent === "reserve") {
			await api.printJobs.reserve(params.id);

			return { error: null, message: "Held for you. Confirm once you know you can make the date." };
		}

		if (intent === "confirm") {
			await api.printJobs.confirm(params.id);

			return { error: null, message: "The job is yours." };
		}

		if (intent === "release") {
			await api.printJobs.release(params.id);

			return { error: null, message: "Job given back." };
		}

		if (isProofIntent(intent)) {
			const { data: job } = await api.printJobs.show(params.id);

			if (!job.bookingId) return { error: "This job isn't yours any more.", message: null };

			return await proofAction(api, job.bookingId, intent, form);
		}

		if (intent === "print-photo") {
			const photo = postedPhoto(form);

			if (!photo) return { error: "Choose a photo first.", message: null };

			await api.printJobs.printPhoto(params.id, photo);

			return { error: null, message: "Print photo added." };
		}
	} catch (error) {
		const result = formError(error);

		return { error: result.fieldErrors.amountMinor ? null : result.error, message: null, fieldErrors: { amount: result.fieldErrors.amountMinor } };
	}

	return { error: "Something went wrong. Try again.", message: null };
}

/** One print job: where and how big, the pay, and the next thing for the dispatcher to do. */
export default function JobPage({ loaderData, actionData }: Route.ComponentProps) {
	useToastMessage(actionData);

	const { job } = loaderData;
	const board = job.board;

	return (
		<main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
			<Link prefetch="intent" to={job.mine ? "/jobs?view=mine" : "/jobs"} className="inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-ink-900">
				<ArrowLeft className="h-4 w-4" aria-hidden />
				Print jobs
			</Link>

			<div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
				<section className="space-y-4">
					<div className="panel space-y-4 p-5 sm:p-6">
						<JobStatusBadge status={job.status} />
						<h1 className="font-display text-3xl leading-tight font-extrabold tracking-[-0.03em] text-ink-900">{board?.name ?? "Board"}</h1>
						<ul className="space-y-2 text-ink-700">
							{board && (
								<li className="flex items-center gap-2">
									<MapPin className="h-5 w-5 shrink-0 text-ink-500" aria-hidden />
									<span>
										{boardPlace(board)}
										{job.distanceM !== null && <span className="text-ink-500"> · {formatDistance(job.distanceM)} away</span>}
									</span>
								</li>
							)}
							{board && (
								<li className="flex items-center gap-2">
									<Ruler className="h-5 w-5 shrink-0 text-ink-500" aria-hidden />
									{board.kindLabel}, {formatSize(board)}
									{board.faces > 1 ? `, ${board.faces} faces` : ""}
								</li>
							)}
							<li className="flex items-center gap-2">
								<CalendarClock className="h-5 w-5 shrink-0 text-ink-500" aria-hidden />
								Up by {formatDay(job.dueOn)}
							</li>
						</ul>
						{job.priced && (
						<div className="flex items-baseline justify-between rounded-2xl bg-surface-100 px-4 py-3">
							<span className="text-sm text-ink-700">{job.bonusMinor > 0 ? `You earn, once the ad is up. Includes a ${formatMoney(job.bonusMinor, job.currency)} rush bonus.` : "You earn, once the ad is up"}</span>
							<span className="font-display text-xl font-extrabold text-ink-900 tabular-nums">{formatMoney(job.feeMinor, job.currency)}</span>
						</div>
						)}
						{actionData?.error && <Alert>{actionData.error}</Alert>}
						<NextStep job={job} fieldError={actionData && "fieldErrors" in actionData ? actionData.fieldErrors?.amount : undefined} />
					</div>

					{job.mine && job.proof && ["printed", "posted"].includes(job.status) && <ProofPanel proof={job.proof} />}

					{job.mine && job.artworkUrl && (
						<div className="panel space-y-3 p-5 sm:p-6">
							<h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900">Artwork to print</h2>
							{job.bookedDays && <p className="text-sm text-ink-500">It runs {formatDays(job.bookedDays)}.</p>}
							<figure className="overflow-hidden rounded-2xl bg-surface-100">
								<img src={job.artworkUrl} alt="The approved artwork" className="max-h-80 w-full object-contain" />
							</figure>
							<a href={job.artworkUrl} download className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800">
								<Download className="h-4 w-4" aria-hidden />
								Download full size
							</a>
						</div>
					)}
				</section>

				<section className="space-y-4">
					{board && (
						<div className="panel space-y-3 p-3">
							<BoardCover board={board} />
							<a href={mapLink(board.latitude, board.longitude)} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-1 pb-1 text-sm font-semibold text-brand-700 hover:underline">
								<Navigation className="h-4 w-4" aria-hidden />
								Directions to the board
								<ExternalLink className="h-3.5 w-3.5" aria-hidden />
							</a>
						</div>
					)}
					{job.printPhotoUrl && (
						<figure className="panel space-y-2 p-3">
							<img src={job.printPhotoUrl} alt="The finished print" className="w-full rounded-2xl object-cover" />
							<figcaption className="px-1 pb-1 text-sm text-ink-500">Your photo of the finished print.</figcaption>
						</figure>
					)}
				</section>
			</div>
		</main>
	);
}

/** What the dispatcher does next: price the job (or reserve one that went back at its price), then show the print. */
function NextStep({ job, fieldError }: { job: PrintJob; fieldError?: string }) {
	const navigation = useNavigation();
	const intent = navigation.formData?.get("intent");

	if (job.status === "open" && !job.priced) return <SendPrice job={job} fieldError={fieldError} />;

	if (job.status === "open") {
		return (
			<div className="space-y-2">
				<Form method="post">
					<input type="hidden" name="intent" value="reserve" />
					<Button type="submit" className="w-full" disabled={!!intent}>
						{intent === "reserve" ? <Spinner /> : <Hand className="h-4 w-4" aria-hidden />}
						Reserve this job
					</Button>
				</Form>
				<p className="text-xs text-ink-500">The last dispatcher missed this job, so it's open again at the price already paid. Reserve it and we'll hold it for you for a few hours while you check the date and materials. Miss the print or go-live date and you lose the job. Repeated misses suspend your dispatcher role.</p>
			</div>
		);
	}

	if (!job.mine) return null;

	if (job.status === "reserved") {
		return (
			<div className="space-y-3">
				{job.reservedUntil && <HoldLeft until={job.reservedUntil} />}
				<div className="flex flex-wrap gap-2">
					<Form method="post">
						<input type="hidden" name="intent" value="confirm" />
						<Button type="submit" disabled={!!intent}>
							{intent === "confirm" ? <Spinner /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
							I can do it
						</Button>
					</Form>
					<GiveBack busy={intent === "release"} disabled={!!intent} />
				</div>
			</div>
		);
	}

	if (job.status === "confirmed") {
		return (
			<div className="space-y-3">
				<p className="text-sm text-ink-700">Print the artwork, then add a photo of the finished print by {formatDay(job.printBy)}. After that date the job goes to someone else.</p>
				<div className="flex flex-wrap gap-2">
					<PrintPhoto busy={intent === "print-photo"} />
					<GiveBack busy={intent === "release"} disabled={!!intent} />
				</div>
			</div>
		);
	}

	if (job.status === "printed") return <p className="text-sm text-ink-700">Printed. Put it up by {formatDay(job.dueOn)}, then take the proof photos below while you're at the board.</p>;

	if (job.status === "posted") return <p className="text-sm text-ink-700">Posted. You're paid once the advertiser accepts your photos.</p>;

	return null;
}

function HoldLeft({ until }: { until: string }) {
	const [left, setLeft] = useState(() => Math.max(0, Math.round((new Date(until).getTime() - Date.now()) / 60_000)));

	useEffect(() => {
		const timer = setInterval(() => setLeft(Math.max(0, Math.round((new Date(until).getTime() - Date.now()) / 60_000))), 30_000);

		return () => clearInterval(timer);
	}, [until]);

	const hours = Math.floor(left / 60);

	return <p className="text-sm text-ink-700">{left > 0 ? `Held for you for ${hours ? `${hours} h ` : ""}${left % 60} min more. Confirm to keep it.` : "Your hold ran out. Anyone can take it now."}</p>;
}

function GiveBack({ busy, disabled }: { busy: boolean; disabled: boolean }) {
	return (
		<Form method="post">
			<input type="hidden" name="intent" value="release" />
			<Button type="submit" variant="ghost" disabled={disabled}>
				{busy ? <Spinner /> : <Undo2 className="h-4 w-4" aria-hidden />}
				Give it back
			</Button>
		</Form>
	);
}

function PrintPhoto({ busy }: { busy: boolean }) {
	return (
		<Form method="post" encType="multipart/form-data" onChange={(event) => event.currentTarget.requestSubmit()}>
			<input type="hidden" name="intent" value="print-photo" />
			<label className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[0.875rem] bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(131,59,75,0.3)] transition hover:bg-brand-600 ${busy ? "pointer-events-none opacity-60" : ""}`}>
				{busy ? <Spinner /> : <Camera className="h-4 w-4" aria-hidden />}
				{busy ? "Uploading" : "Add print photo"}
				<input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/heic" capture="environment" className="sr-only" />
			</label>
		</Form>
	);
}
