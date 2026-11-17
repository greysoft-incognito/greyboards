/** A drawn city map: water, parks, blocks and roads, to sit behind floating panels. Decoration only. */
export function MapBackdrop({ className = "" }: { className?: string }) {
	return (
		<svg viewBox="0 0 1280 900" preserveAspectRatio="xMidYMid slice" className={`h-full w-full ${className}`} aria-hidden>
			<rect width="1280" height="900" fill="#eef0f2" />
			<path d="M0 610 C 220 560, 420 650, 640 612 S 1020 540, 1280 586 L1280 900 L0 900 Z" fill="#cfdbe5" />
			<path d="M760 0 C 790 180, 720 330, 800 470 S 880 600, 840 900" fill="none" stroke="#cfdbe5" strokeWidth="64" />
			<path d="M300 330 h120 v90 h-120z M980 120 h150 v110 h-150z M120 690 h170 v80 h-170z" fill="#dde8dc" />
			<g fill="#e4e7ea">
				<rect x="470" y="70" width="90" height="60" rx="6" />
				<rect x="580" y="70" width="70" height="60" rx="6" />
				<rect x="470" y="150" width="180" height="70" rx="6" />
				<rect x="890" y="300" width="110" height="80" rx="6" />
				<rect x="1020" y="300" width="120" height="80" rx="6" />
				<rect x="560" y="400" width="140" height="90" rx="6" />
				<rect x="1000" y="680" width="140" height="70" rx="6" />
				<rect x="420" y="700" width="160" height="80" rx="6" />
			</g>
			<g fill="none" strokeLinecap="round">
				<path d="M0 360 L1280 320" stroke="#dadde1" strokeWidth="26" />
				<path d="M0 360 L1280 320" stroke="#ffffff" strokeWidth="20" />
				<path d="M440 0 L520 900" stroke="#dadde1" strokeWidth="22" />
				<path d="M440 0 L520 900" stroke="#ffffff" strokeWidth="16" />
				<path d="M0 180 C 380 200, 700 150, 1280 220" stroke="#ffffff" strokeWidth="12" />
				<path d="M660 0 C 680 260, 700 440, 760 900" stroke="#ffffff" strokeWidth="10" />
				<path d="M980 0 L1060 900" stroke="#ffffff" strokeWidth="9" />
				<path d="M0 500 L1280 470" stroke="#ffffff" strokeWidth="9" />
				<path d="M140 740 C 420 770, 800 720, 1280 760" stroke="#f6e7b0" strokeWidth="14" />
			</g>
		</svg>
	);
}

export type PinTone = "available" | "bid" | "booked";

const PIN_DOTS: Record<PinTone, string> = { available: "bg-available", bid: "bg-brand-500", booked: "bg-ink-500" };

/** A price tag pinned to a point on the map, `at` in percent of the map. */
export function MapPin({ label, at, tone = "available", active = false }: { label: string; at: { x: number; y: number }; tone?: PinTone; active?: boolean }) {
	return (
		<span
			style={{ left: `${at.x}%`, top: `${at.y}%` }}
			className={`absolute flex min-h-9 -translate-x-1/2 -translate-y-full items-center gap-2 rounded-full px-3.5 text-[13px] font-bold whitespace-nowrap tabular-nums ${
				active
					? "z-[2] bg-brand-500 text-white shadow-[0_0_0_6px_rgba(131,59,75,0.18),0_10px_24px_rgba(131,59,75,0.4)]"
					: "z-[1] bg-white text-ink-900 shadow-[0_2px_4px_rgba(30,31,34,0.1),0_8px_18px_rgba(30,31,34,0.12)]"
			}`}
		>
			<span className={`h-2 w-2 rounded-full ${active ? "bg-white" : PIN_DOTS[tone]}`} aria-hidden />
			{label}
		</span>
	);
}
