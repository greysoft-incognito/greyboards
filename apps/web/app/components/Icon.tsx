import { CalendarCheck, Camera, CircleHelp, FileText, Gauge, Handshake, IdCard, KeyRound, type LucideIcon, Printer, Shield, SlidersHorizontal, Upload, Users, Wallet } from "lucide-react";

/** Lucide icons the API can name, such as a settings group's icon. */
const ICONS: Record<string, LucideIcon> = {
	"calendar-check": CalendarCheck,
	camera: Camera,
	"file-text": FileText,
	gauge: Gauge,
	handshake: Handshake,
	"id-card": IdCard,
	"key-round": KeyRound,
	printer: Printer,
	shield: Shield,
	"sliders-horizontal": SlidersHorizontal,
	upload: Upload,
	users: Users,
	wallet: Wallet,
};

/** The Lucide icon the API named, or a question mark for a name this app doesn't know yet. */
export function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
	const Named = ICONS[name] ?? CircleHelp;

	return <Named className={`shrink-0 ${className}`} aria-hidden />;
}
