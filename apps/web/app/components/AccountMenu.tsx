import { Form, Link } from "react-router";
import { BadgeCheck, LogOut, MonitorSmartphone, Settings, ShieldCheck } from "lucide-react";
import type { User } from "@greyboards/types";
import { Avatar } from "~/components/Avatar";

/** The avatar button and its menu. It closes on every navigation because it is keyed by the path. */
export function AccountMenu({ user }: { user: User }) {
	const item = "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-surface-100 hover:text-ink-900";
	const icon = "h-4 w-4 shrink-0 text-ink-500";

	return (
		<details className="group relative">
			<summary className="cursor-pointer list-none rounded-full ring-brand-500/30 transition group-open:ring-4 hover:ring-4 [&::-webkit-details-marker]:hidden" aria-label="Account">
				<Avatar user={user} />
			</summary>
			<div className="absolute right-0 mt-2 w-64 panel rounded-2xl p-2 !shadow-xl">
				<div className="px-3 py-2">
					<p className="truncate text-sm font-semibold text-ink-900">{user.name}</p>
					<p className="truncate text-xs text-ink-500">{user.email}</p>
				</div>
				<div className="my-1 border-t border-surface-200" />
				<Link prefetch="intent" to="/settings/roles" className={item}>
					<BadgeCheck className={icon} aria-hidden />
					How you use Greyboards
				</Link>
				<Link prefetch="intent" to="/settings" className={item}>
					<Settings className={icon} aria-hidden />
					Settings
				</Link>
				<Link prefetch="intent" to="/settings/devices" className={item}>
					<MonitorSmartphone className={icon} aria-hidden />
					Devices
				</Link>
				{user.permissions.length > 0 && (
					<Link prefetch="intent" to="/admin" className={item}>
						<ShieldCheck className={icon} aria-hidden />
						Admin
					</Link>
				)}
				<div className="my-1 border-t border-surface-200" />
				<Form method="post" action="/signout">
					<button type="submit" className={`${item} w-full text-left`}>
						<LogOut className={icon} aria-hidden />
						Sign out
					</button>
				</Form>
			</div>
		</details>
	);
}
