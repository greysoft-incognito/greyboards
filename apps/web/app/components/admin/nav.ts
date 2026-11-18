import type { Permission } from "@greyboards/types";
import { Award, BadgeCheck, CalendarCheck, FileText, Gauge, KeyRound, type LucideIcon, MapPinned, Presentation, ShieldAlert, SlidersHorizontal, Users, Wallet } from "lucide-react";

/** The admin sidebar, in order. Each page shows to roles holding any of its permissions. */
export const ADMIN_PAGES: { to: string; label: string; icon: LucideIcon; permissions: Permission[]; end?: boolean }[] = [
	{ to: "/admin", label: "Overview", icon: Gauge, permissions: ["dashboard.view"], end: true },
	{ to: "/admin/users", label: "Users", icon: Users, permissions: ["users.view", "users.manage"] },
	{ to: "/admin/applications", label: "Applications", icon: BadgeCheck, permissions: ["partners.review"] },
	{ to: "/admin/reputation", label: "Reputation", icon: Award, permissions: ["reputation.manage"] },
	{ to: "/admin/territories", label: "Territories", icon: MapPinned, permissions: ["partners.review"] },
	{ to: "/admin/boards", label: "Boards", icon: Presentation, permissions: ["boards.review"] },
	{ to: "/admin/bookings", label: "Bookings", icon: CalendarCheck, permissions: ["bookings.view"] },
	{ to: "/admin/payouts", label: "Payouts", icon: Wallet, permissions: ["payouts.manage"] },
	{ to: "/admin/disputes", label: "Disputes", icon: ShieldAlert, permissions: ["disputes.resolve"] },
	{ to: "/admin/pages", label: "Pages", icon: FileText, permissions: ["pages.manage"] },
	{ to: "/admin/roles", label: "Roles", icon: KeyRound, permissions: ["roles.manage"] },
	{ to: "/admin/configuration", label: "Configuration", icon: SlidersHorizontal, permissions: ["settings.manage"] },
];
