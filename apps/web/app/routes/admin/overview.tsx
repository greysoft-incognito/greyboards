import { Link } from "react-router";
import { AdminHeader } from "~/components/admin/AdminHeader";
import { Avatar } from "~/components/Avatar";
import { StatTiles } from "~/components/admin/StatTiles";
import { ROLE_ICONS } from "~/components/AccountRoles";
import { requireAdmin } from "~/lib/admin.server";
import type { Route } from "./+types/overview";

export const meta = () => [{ title: "Overview · Admin · Greyboards" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api, user } = await requireAdmin(request, context, "dashboard.view");
	const { data } = await api.admin.overview();

	return {
		overview: data,
		canManageUsers: user.permissions.some((permission) => permission === "users.view" || permission === "users.manage"),
		canReview: user.permissions.includes("partners.review"),
	};
}

const number = new Intl.NumberFormat("en");

export default function AdminOverview({ loaderData }: Route.ComponentProps) {
	const { overview, canManageUsers, canReview } = loaderData;
	const stats = [
		{ label: "Accounts", value: number.format(overview.users.total), note: `${number.format(overview.users.new)} new in ${overview.newUserDays} days` },
		{ label: "Team", value: number.format(overview.users.staff), note: `${number.format(overview.users.suspended)} accounts suspended` },
	];
	const roles = [
		{ kind: "advertiser", label: "Advertisers" },
		{ kind: "owner", label: "Board owners" },
		{ kind: "scout", label: "Scouts" },
		{ kind: "billposter", label: "Billposters" },
	] as const;

	return (
		<>
			<AdminHeader title="Overview" description="How Greyboards is doing at a glance." />
			<div className="space-y-8 px-4 py-8 sm:px-8">
				<StatTiles items={stats} />

				<section className="panel">
					<div className="flex items-center justify-between gap-4 border-b-[1.5px] border-surface-200 px-5 py-4">
						<h2 className="font-display text-lg font-bold text-ink-900">Marketplace roles</h2>
						{canReview && (
							<Link prefetch="intent" to="/admin/applications" className="text-sm font-semibold text-brand-700 hover:underline">
								Review applications
							</Link>
						)}
					</div>
					<ul className="grid divide-surface-200 sm:grid-cols-2 sm:divide-x xl:grid-cols-4">
						{roles.map((role) => {
							const Icon = ROLE_ICONS[role.kind];
							const counts = overview.accountRoles[role.kind];

							return (
								<li key={role.kind} className="flex items-center gap-3 px-5 py-4">
									<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
										<Icon className="h-5 w-5" aria-hidden />
									</span>
									<div>
										<p className="text-sm font-medium text-ink-500">{role.label}</p>
										<p className="font-display text-xl font-bold text-ink-900">
											{number.format(counts.active)}
											{counts.pending > 0 && <span className="ml-2 text-sm font-semibold text-held">{number.format(counts.pending)} waiting</span>}
										</p>
									</div>
								</li>
							);
						})}
					</ul>
				</section>

				<section className="panel">
					<div className="flex items-center justify-between gap-4 border-b-[1.5px] border-surface-200 px-5 py-4">
						<h2 className="font-display text-lg font-bold text-ink-900">Newest accounts</h2>
						{canManageUsers && (
							<Link prefetch="intent" to="/admin/users" className="text-sm font-semibold text-brand-700 hover:underline">
								All users
							</Link>
						)}
					</div>
					<ul className="divide-y divide-surface-200">
						{overview.recentUsers.map((account) => (
							<li key={account.id} className="flex items-center gap-3 px-5 py-3">
								<Avatar user={account} />
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-semibold text-ink-900">
										{canManageUsers ? (
											<Link prefetch="intent" to={`/admin/users/${account.id}`} className="hover:text-brand-700 hover:underline">
												{account.name}
											</Link>
										) : (
											account.name
										)}
									</p>
									<p className="truncate text-sm text-ink-500">{account.email}</p>
								</div>
								<span className="hidden text-sm text-ink-500 sm:block">
									{new Date(account.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
								</span>
							</li>
						))}
					</ul>
				</section>
			</div>
		</>
	);
}
