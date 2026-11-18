import { MonitorPlay } from "lucide-react";
import type { PlaySummary } from "@greyboards/types";

/**
 * How often a digital booking's ad played, from the screen's player: the total, and a bar for
 * each of the last days with plays.
 */
export function PlaysPanel({ plays }: { plays: PlaySummary }) {
	const busiest = Math.max(1, ...plays.days.map((day) => day.plays));
	const minutes = Math.round(plays.seconds / 60);

	return (
		<div className="panel space-y-4 p-5 sm:p-6">
			<h2 className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-ink-900">
				<MonitorPlay className="h-5 w-5 text-brand-600" aria-hidden />
				Plays
			</h2>
			{plays.total === 0 ? (
				<p className="text-sm text-ink-500">No plays yet. They'll show here as your ad runs.</p>
			) : (
				<>
					<p className="text-sm text-ink-700">
						<strong className="font-display text-2xl font-extrabold text-ink-900 tabular-nums">{plays.total.toLocaleString("en-NG")}</strong> plays,{" "}
						{minutes > 0 ? `${minutes.toLocaleString("en-NG")} minutes` : `${plays.seconds} seconds`} on screen
						{plays.lastPlayedAt && `. Last at ${new Date(plays.lastPlayedAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}`}.
					</p>
					<ul className="flex h-28 items-end gap-1" aria-label="Plays each day">
						{plays.days.map((day) => (
							<li key={day.day} className="flex h-full min-w-0 flex-1 items-end" title={`${day.day}: ${day.plays} plays`}>
								<span className="w-full rounded-t-md bg-brand-500" style={{ height: `${Math.max(4, (day.plays / busiest) * 100)}%` }} />
								<span className="sr-only">
									{day.day}: {day.plays} plays
								</span>
							</li>
						))}
					</ul>
				</>
			)}
		</div>
	);
}
