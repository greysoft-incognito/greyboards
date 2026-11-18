import { Link } from "react-router";
import { BadgeCheck, CalendarClock, Camera, FileSignature, type LucideIcon, Palette, Printer, UserRoundSearch } from "lucide-react";
import type { ProspectStage, Task, TaskKind } from "@greyboards/types";
import { formatDay } from "~/components/bookings/BookingBits";

export const STAGES: { value: ProspectStage; label: string; tone: string }[] = [
	{ value: "prospect", label: "Spotted", tone: "bg-surface-100 text-ink-700" },
	{ value: "contacted", label: "Contacted", tone: "bg-sky-100 text-sky-800" },
	{ value: "signed", label: "Signed", tone: "bg-violet-100 text-violet-800" },
	{ value: "captured", label: "Captured", tone: "bg-amber-100 text-amber-800" },
	{ value: "verified", label: "Verified", tone: "bg-emerald-100 text-emerald-800" },
	{ value: "earning", label: "Earning", tone: "bg-brand-100 text-brand-800" },
	{ value: "lost", label: "Let go", tone: "bg-surface-100 text-ink-500" },
];

/** The stages a scout sets by hand; the rest follow the board. */
export const MANUAL_STAGES: ProspectStage[] = ["prospect", "contacted", "signed", "lost"];

export function StageBadge({ stage }: { stage: ProspectStage }) {
	const look = STAGES.find((entry) => entry.value === stage)!;

	return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold ${look.tone}`}>{look.label}</span>;
}

const TASK_ICONS: Record<TaskKind, LucideIcon> = {
	artwork: Palette,
	install: Printer,
	proof: Camera,
	agreement: FileSignature,
	follow_up: UserRoundSearch,
};

function taskLink(task: Task) {
	if (task.bookingId) return `/bookings/${task.bookingId}`;
	if (task.boardId) return `/boards/${task.boardId}`;

	return `/pipeline#prospect-${task.prospectId}`;
}

/** What needs doing on boards the account looks after and in its pipeline, soonest first. */
export function TaskList({ tasks, limit }: { tasks: Task[]; limit?: number }) {
	const shown = limit ? tasks.slice(0, limit) : tasks;

	if (!tasks.length) {
		return (
			<p className="flex items-center gap-2 text-sm text-ink-500">
				<BadgeCheck className="h-4 w-4 text-available" aria-hidden />
				Nothing to do right now.
			</p>
		);
	}

	return (
		<ul className="divide-y divide-surface-100">
			{shown.map((task, index) => {
				const Icon = TASK_ICONS[task.kind];

				return (
					<li key={`${task.kind}-${task.bookingId ?? task.boardId ?? task.prospectId}-${index}`}>
						<Link prefetch="intent" to={taskLink(task)} className="flex items-start gap-3 rounded-xl px-2 py-3 hover:bg-surface-100">
							<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
								<Icon className="h-4 w-4" aria-hidden />
							</span>
							<span className="min-w-0 flex-1">
								<span className="block text-sm font-semibold text-ink-900">{task.title}</span>
								<span className="block text-sm text-ink-500">{task.detail}</span>
							</span>
							{task.dueOn && (
								<span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-ink-500 tabular-nums">
									<CalendarClock className="h-3.5 w-3.5" aria-hidden />
									{formatDay(task.dueOn)}
								</span>
							)}
						</Link>
					</li>
				);
			})}
			{limit && tasks.length > limit && <li className="px-2 pt-3 text-sm text-ink-500">And {tasks.length - limit} more.</li>}
		</ul>
	);
}
