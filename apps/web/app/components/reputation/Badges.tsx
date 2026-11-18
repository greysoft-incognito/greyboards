import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";
import { Award, Gauge, type LucideIcon, ShieldCheck } from "lucide-react";
import type { BadgeKey, RoleStanding } from "@greyboards/types";

interface BadgeLook {
	label: string;
	icon: LucideIcon;
	className: string;
	summary: string;
}

/** The two badges look different on purpose: staff verification is solid wine, the earned badge is an amber outline. */
export const BADGES: Record<BadgeKey, BadgeLook> = {
	verified: {
		label: "Verified",
		icon: ShieldCheck,
		className: "bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_6px_16px_rgba(131,59,75,0.35)]",
		summary: "Checked in person by Greyboards staff. Points can’t earn it.",
	},
	proven: {
		label: "Proven",
		icon: Award,
		className: "bg-white text-ink-900 ring-[1.5px] ring-amber-400 shadow-[0_4px_12px_rgba(178,106,0,0.18)]",
		summary: "Earned through work we could confirm, like accepted proof photos and signed agreements. Staff haven’t checked them in person.",
	},
};

/** One badge that opens a short note on what it means, with a link to the full explanation. */
export function Badge({ kind, compact = false }: { kind: BadgeKey; compact?: boolean }) {
	const [open, setOpen] = useState(false);
	const box = useRef<HTMLSpanElement>(null);
	const id = useId();
	const look = BADGES[kind];
	const Icon = look.icon;

	useEffect(() => {
		if (!open) return;

		const close = (event: MouseEvent | KeyboardEvent) => {
			if (event instanceof KeyboardEvent ? event.key === "Escape" : !box.current?.contains(event.target as Node)) setOpen(false);
		};

		document.addEventListener("mousedown", close);
		document.addEventListener("keydown", close);

		return () => {
			document.removeEventListener("mousedown", close);
			document.removeEventListener("keydown", close);
		};
	}, [open]);

	return (
		<span ref={box} className="relative inline-flex">
			<button
				type="button"
				onClick={() => setOpen((value) => !value)}
				aria-expanded={open}
				aria-controls={id}
				title={look.summary}
				className={`inline-flex items-center gap-1 rounded-full font-bold transition hover:-translate-y-px ${compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"} ${look.className}`}
			>
				<Icon className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"} ${kind === "proven" ? "text-amber-500" : ""}`} aria-hidden />
				{look.label}
			</button>
			{open && (
				<span id={id} role="note" className="glass absolute left-0 top-full z-30 mt-2 block w-64 rounded-2xl p-3 text-left text-xs font-normal leading-relaxed text-ink-700">
					<strong className="mb-1 flex items-center gap-1.5 text-sm text-ink-900">
						<Icon className={`h-4 w-4 ${kind === "proven" ? "text-amber-500" : "text-brand-500"}`} aria-hidden />
						{kind === "verified" ? "Verified by Greyboards" : "Proven"}
					</strong>
					{look.summary}{" "}
					<Link to="/reputation" className="font-semibold text-brand-600 underline-offset-2 hover:underline">
						How badges work
					</Link>
				</span>
			)}
		</span>
	);
}

/** The score and any badges a person holds in one role. Shows nothing for a role they don't hold. */
export function Standing({ standing, showScore = true, compact = false, className = "" }: { standing: RoleStanding | null | undefined; showScore?: boolean; compact?: boolean; className?: string }) {
	if (!standing) return null;
	if (!showScore && !standing.verified && !standing.proven) return null;

	return (
		<span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
			{standing.verified && <Badge kind="verified" compact={compact} />}
			{standing.proven && <Badge kind="proven" compact={compact} />}
			{showScore && <Score value={standing.score} compact={compact} />}
		</span>
	);
}

/** A reputation score as a small chip. */
export function Score({ value, compact = false }: { value: number; compact?: boolean }) {
	return (
		<span
			className={`inline-flex items-center gap-1 rounded-full bg-surface-100 font-semibold tabular-nums ${value < 0 ? "text-red-700" : "text-ink-700"} ${compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"}`}
			title="Reputation score in this role"
		>
			<Gauge className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
			{value}
			<span className="sr-only"> reputation points</span>
		</span>
	);
}
