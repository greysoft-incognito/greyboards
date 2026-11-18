import { useEffect, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { CalendarCheck, LayoutDashboard, type LucideIcon, Map as MapIcon, MapPinned, Presentation, Printer } from "lucide-react";
import type { AccountRoleKind, User } from "@greyboards/types";
import { Logo, buttonClass } from "~/components/ui";
import { AccountMenu } from "~/components/AccountMenu";

const tab = ({ isActive }: { isActive: boolean }) =>
	`flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition max-sm:flex-1 max-sm:flex-col max-sm:gap-0.5 max-sm:px-1 max-sm:py-1.5 max-sm:text-[0.6875rem] sm:px-4 ${isActive ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-surface-100"}`;

/** The areas a signed-in account can open. An area with `roles` shows to accounts holding any of them. */
const AREAS: { to: string; label: string; icon: LucideIcon; roles?: AccountRoleKind[] }[] = [
	{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ to: "/map", label: "Map", icon: MapIcon },
	{ to: "/boards", label: "Boards", icon: Presentation, roles: ["owner", "scout"] },
	{ to: "/bookings", label: "Bookings", icon: CalendarCheck },
	{ to: "/pipeline", label: "Pipeline", icon: MapPinned, roles: ["scout"] },
	{ to: "/jobs", label: "Jobs", icon: Printer, roles: ["billposter"] },
];

/** The top bar. Signed-in people get their areas, on a row of their own on phones; visitors get a way in. Its height is kept in `--header-height` for content that sticks below it. */
export function AppHeader({ user }: { user: User | null }) {
	const { pathname } = useLocation();
	const header = useRef<HTMLElement>(null);

	useEffect(() => {
		const element = header.current;

		if (!element) return;

		const root = document.documentElement;
		const observer = new ResizeObserver(() => root.style.setProperty("--header-height", `${element.offsetHeight}px`));

		observer.observe(element);

		return () => observer.disconnect();
	}, []);

	return (
		<header ref={header} className="sticky top-0 z-20 px-3 pt-3 sm:px-5 print:hidden">
			<div className="glass mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-[1.25rem] py-2.5 pr-2.5 pl-4">
				<Logo to={user ? "/dashboard" : "/"} compact />
				{user && (
					<nav aria-label="Main" className="flex items-center gap-1 max-sm:order-last max-sm:w-full sm:ml-auto">
						{AREAS.filter((area) => !area.roles || user.accountRoles.some((role) => area.roles!.includes(role.kind))).map((area) => (
							<NavLink key={area.to} prefetch="intent" to={area.to} className={tab}>
								<area.icon className="h-4 w-4" aria-hidden />
								{area.label}
							</NavLink>
						))}
					</nav>
				)}
				{user ? (
					<AccountMenu key={pathname} user={user} />
				) : (
					<div className="flex items-center gap-1 sm:gap-2">
						<Link prefetch="intent" to="/map" className={buttonClass("ghost", "max-sm:hidden")}>
							Find a board
						</Link>
						<Link prefetch="intent" to="/about" className={buttonClass("ghost", "max-lg:hidden")}>
							How it works
						</Link>
						<Link prefetch="intent" to={`/signin?next=${encodeURIComponent(pathname)}`} className={buttonClass("ghost")}>
							Sign in
						</Link>
						<Link prefetch="intent" to="/signup" className={buttonClass("primary")}>
							Get started
						</Link>
					</div>
				)}
			</div>
		</header>
	);
}
