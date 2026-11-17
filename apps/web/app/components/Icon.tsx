import { CircleHelp, FileText, Gauge, Handshake, KeyRound, type LucideIcon, Shield, SlidersHorizontal, Upload, Users } from "lucide-react";

/** Lucide icons the API can name, such as a settings group's icon. */
const ICONS: Record<string, LucideIcon> = {
	"file-text": FileText,
	gauge: Gauge,
	handshake: Handshake,
	"key-round": KeyRound,
	shield: Shield,
	"sliders-horizontal": SlidersHorizontal,
	upload: Upload,
	users: Users,
};

/** The Lucide icon the API named, or a question mark for a name this app doesn't know yet. */
export function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
	const Named = ICONS[name] ?? CircleHelp;

	return <Named className={`shrink-0 ${className}`} aria-hidden />;
}
