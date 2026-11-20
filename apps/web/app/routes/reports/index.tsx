import { useState } from "react";
import { Form, Link, useNavigation } from "react-router";
import { ArrowLeft, Check, Copy, ExternalLink, FileChartColumn, Link2, Trash2 } from "lucide-react";
import type { CampaignReportSummary } from "@greyboards/types";
import { formatDay, formatDays } from "~/components/bookings/BookingBits";
import { Pager } from "~/components/Pager";
import { Alert, Button, Field, Input, Spinner } from "~/components/ui";
import { formError } from "~/lib/api.server";
import { requireUser } from "~/lib/session.server";
import { useToastMessage } from "~/lib/toast";
import type { Route } from "./+types/index";

export const meta = () => [{ title: "Campaign reports · Greyboards" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireUser(request, context);
	const page = Number(new URL(request.url).searchParams.get("page")) || 1;
	const [reports, bookings] = await Promise.all([api.reports.list({ page }), api.reports.bookings({ per_page: 100 })]);

	return { reports: reports.data, meta: reports.meta, bookings: bookings.data };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireUser(request, context);
	const form = await request.formData();
	const intent = String(form.get("intent"));
	const id = String(form.get("id") ?? "");

	try {
		if (intent === "relink") {
			await api.reports.relink(id);

			return { error: null, message: "New link created. The old one won't work anymore." };
		}

		if (intent === "delete") {
			await api.reports.remove(id);

			return { error: null, message: "Report deleted." };
		}

		const bookingIds = form.getAll("bookingIds").map(String);

		if (!bookingIds.length) return { error: "Pick at least one booking.", message: null };

		await api.reports.create({ title: String(form.get("title") ?? ""), bookingIds });

		return { error: null, message: "Report ready to share." };
	} catch (error) {
		return { error: formError(error).error, message: null };
	}
}

/** The advertiser's campaign reports, and a form to make one from bookings whose ads went up. */
export default function Reports({ loaderData, actionData }: Route.ComponentProps) {
	useToastMessage(actionData);

	const { reports, meta, bookings } = loaderData;
	const navigation = useNavigation();
	const creating = navigation.formData?.get("intent") === "create";

	return (
		<main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
			<div>
				<Link prefetch="intent" to="/bookings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900">
					<ArrowLeft className="h-4 w-4" aria-hidden />
					Bookings
				</Link>
				<h1 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-4xl">Campaign reports</h1>
				<p className="mt-1 text-ink-500">Put your bookings together in one shareable page, with every board, date and photo.</p>
			</div>
			{actionData?.error && <Alert>{actionData.error}</Alert>}

			<div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
				<section className="space-y-3">
					{reports.length ? reports.map((report) => <ReportLine key={report.id} report={report} />) : <p className="panel px-5 py-10 text-center text-sm text-ink-500">No reports yet.</p>}
					<Pager meta={meta} noun="reports" />
				</section>

				<section className="panel h-fit space-y-4 p-5">
					<h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900">New report</h2>
					{bookings.length ? (
						<Form method="post" className="space-y-4">
							<input type="hidden" name="intent" value="create" />
							<Field label="Title">
								<Input name="title" required minLength={3} maxLength={120} placeholder="Such as: Kaduna launch, November" />
							</Field>
							<fieldset className="space-y-1">
								<legend className="text-sm font-semibold text-ink-700">Bookings</legend>
								<div className="max-h-80 space-y-1 overflow-y-auto">
									{bookings.map((booking) => (
										<label key={booking.id} className="flex items-start gap-3 rounded-xl px-2 py-2 text-sm hover:bg-surface-100">
											<input type="checkbox" name="bookingIds" value={booking.id} className="mt-1 accent-brand-500" />
											<span>
												<span className="block font-semibold text-ink-900">{booking.board?.name ?? "Board"}</span>
												<span className="text-ink-500 tabular-nums">{formatDays(booking)}</span>
											</span>
										</label>
									))}
								</div>
							</fieldset>
							<Button type="submit" className="w-full" disabled={creating}>
								{creating ? <Spinner /> : <FileChartColumn className="h-4 w-4" aria-hidden />}
								Create report
							</Button>
						</Form>
					) : (
						<p className="text-sm text-ink-500">Only bookings with ads that are live can be added.</p>
					)}
				</section>
			</div>
		</main>
	);
}

function ReportLine({ report }: { report: CampaignReportSummary }) {
	const navigation = useNavigation();
	const busy = navigation.formData?.get("id") === report.id;
	const [copied, setCopied] = useState(false);

	const copy = async () => {
		await navigator.clipboard?.writeText(report.link).catch(() => undefined);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<article className="panel flex flex-wrap items-center justify-between gap-3 p-4">
			<div>
				<a href={report.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-ink-900 hover:text-brand-700">
					{report.title}
					<ExternalLink className="h-4 w-4" aria-hidden />
				</a>
				<p className="text-sm text-ink-500">
					{report.bookings} {report.bookings === 1 ? "booking" : "bookings"} · made {formatDay(report.createdAt.slice(0, 10))}
				</p>
			</div>
			<div className="flex flex-wrap gap-1">
				<Button variant="ghost" onClick={copy} className="!py-2">
					{copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
					{copied ? "Copied" : "Copy link"}
				</Button>
				<Form method="post" preventScrollReset>
					<input type="hidden" name="id" value={report.id} />
					<Button confirm={{ title: "Make a new link?", message: "The old link will stop working.", action: "New link", danger: true }} type="submit" name="intent" value="relink" variant="ghost" disabled={busy} className="!py-2" title="Create a new link. The old one will stop working.">
						<Link2 className="h-4 w-4" aria-hidden />
						New link
					</Button>
				</Form>
				<Form method="post" preventScrollReset>
					<input type="hidden" name="id" value={report.id} />
					<Button
						type="submit"
						name="intent"
						value="delete"
						variant="ghost"
						disabled={busy}
						className="!py-2 text-red-700"
						aria-label={`Delete ${report.title}`}
						confirm={{ title: `Delete ${report.title}?`, message: "The link you shared will stop working.", action: "Delete", danger: true }}
					>
						<Trash2 className="h-4 w-4" aria-hidden />
					</Button>
				</Form>
			</div>
		</article>
	);
}
