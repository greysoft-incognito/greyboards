import { CalendarCheck, Camera, CarFront, CircleHelp, FileChartColumn, FileText, Gauge, Gavel, Handshake, IdCard, KeyRound, type LucideIcon, MapPinned, MessagesSquare, MonitorPlay, Percent, Printer, Shield, ShieldAlert, SlidersHorizontal, Star, Upload, Users, UsersRound, Wallet } from "lucide-react";

/** Lucide icons the API can name, such as a settings group's icon. */
const ICONS: Record<string, LucideIcon> = {
	"calendar-check": CalendarCheck,
	camera: Camera,
	"file-text": FileText,
	gauge: Gauge,
	gavel: Gavel,
	handshake: Handshake,
	percent: Percent,
	"id-card": IdCard,
	"key-round": KeyRound,
	"messages-square": MessagesSquare,
	printer: Printer,
	shield: Shield,
	"sliders-horizontal": SlidersHorizontal,
	star: Star,
	"shield-alert": ShieldAlert,
	"file-chart": FileChartColumn,
	"map-pinned": MapPinned,
	upload: Upload,
	users: Users,
	"users-round": UsersRound,
	"car-front": CarFront,
	"monitor-play": MonitorPlay,
	wallet: Wallet,
};

/** The Lucide icon the API named, or a question mark for a name this app doesn't know yet. */
export function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
	const Named = ICONS[name] ?? CircleHelp;

	return <Named className={`shrink-0 ${className}`} aria-hidden />;
}
