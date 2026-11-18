import { CalendarDays, Camera, Images, MapPin, Presentation, Wallet } from "lucide-react";
import type { CampaignReport, CampaignRun } from "@greyboards/types";
import { BoardCover, formatSize } from "~/components/boards/BoardBits";
import { formatDay, formatDays, formatMoney } from "~/components/bookings/BookingBits";
import { formatMoment } from "~/components/bids/BidBits";

/** A campaign report as anyone with the link sees it. It prints to a clean PDF. */
export function ReportView({ report }: { report: CampaignReport }) {
	const { summary } = report;
	const stats = [
		{ icon: Presentation, label: summary.boards === 1 ? "Board" : "Boards", value: String(summary.boards) },
		{ icon: CalendarDays, label: "Days on display", value: String(summary.days) },
		{ icon: Camera, label: summary.photos === 1 ? "Proof photo" : "Proof photos", value: String(summary.photos) },
		...(summary.spendMinor !== null ? [{ icon: Wallet, label: "Spend", value: formatMoney(summary.spendMinor, report.currency) }] : []),
	];

	return (
		<article className="space-y-6">
			<header className="space-y-2">
				<p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">Campaign report</p>
				<h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-4xl">{report.title}</h1>
				<p className="text-ink-500">
					{report.advertiser && <>For {report.advertiser} · </>}
					{summary.startsOn && summary.endsOn ? formatDays({ startsOn: summary.startsOn, endsOn: summary.endsOn }) : "No bookings"}
					{summary.cities.length > 0 && <> · {summary.cities.join(", ")}</>}
				</p>
			</header>

			<dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				{stats.map((stat) => (
					<div key={stat.label} className="panel p-4 print:border print:border-surface-200 print:shadow-none">
						<stat.icon className="h-5 w-5 text-brand-700" aria-hidden />
						<dd className="mt-2 font-display text-2xl font-extrabold text-ink-900 tabular-nums">{stat.value}</dd>
						<dt className="text-sm text-ink-500">{stat.label}</dt>
					</div>
				))}
			</dl>

			{report.runs.map((run) => (
				<RunSection key={run.bookingId} run={run} currency={report.currency} />
			))}

			<p className="text-xs text-ink-500">Every photo was taken at the board and checked against its location. Made with Greyboards.</p>
		</article>
	);
}

function RunSection({ run, currency }: { run: CampaignRun; currency: string }) {
	const board = run.board;

	return (
		<section className="panel space-y-4 p-5 break-inside-avoid sm:p-6 print:border print:border-surface-200 print:shadow-none">
			<div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
				{board && <BoardCover board={board} />}
				<div className="space-y-1.5">
					<h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900">
						{board?.name ?? "Board"}
						{run.face && <span className="font-semibold text-ink-500"> · {run.face}</span>}
					</h2>
					{board && (
						<p className="text-sm text-ink-700">
							{board.kindLabel} · {formatSize(board)}
							{board.lit ? " · Lit at night" : ""}
						</p>
					)}
					{board && (board.address || board.city) && (
						<p className="flex items-start gap-1.5 text-sm text-ink-500">
							<MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
							{[board.address, board.city].filter(Boolean).join(", ")}
						</p>
					)}
					<p className="text-sm font-semibold text-ink-900 tabular-nums">
						{formatDays(run)} · {run.days} {run.days === 1 ? "day" : "days"}
						{run.amountMinor !== null && <span className="font-normal text-ink-500"> · {formatMoney(run.amountMinor, currency)}</span>}
					</p>
					{run.proofAcceptedAt && <p className="text-xs text-ink-500">Proof accepted {formatDay(run.proofAcceptedAt.slice(0, 10))}</p>}
				</div>
			</div>

			{run.photos.length > 0 ? (
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
					{run.photos.map((photo) => (
						<figure key={photo.id} className="space-y-1 break-inside-avoid">
							<a href={photo.url} target="_blank" rel="noreferrer">
								<img src={photo.url} alt={`The ad on ${board?.name ?? "the board"}`} loading="lazy" width={photo.width} height={photo.height} className="aspect-[4/3] w-full rounded-xl bg-surface-100 object-cover" />
							</a>
							<figcaption className="text-xs text-ink-500">
								{formatMoment(photo.takenAt ?? photo.createdAt)} · {photo.distanceM} m from the board
							</figcaption>
						</figure>
					))}
				</div>
			) : (
				<p className="flex items-center gap-2 text-sm text-ink-500">
					<Images className="h-4 w-4" aria-hidden />
					No proof photos on this booking.
				</p>
			)}
		</section>
	);
}
