import { Form, Link, useNavigation, useSearchParams } from "react-router";
import type { AccountRoleKind, BadgeKey } from "@greyboards/types";
import { AdminHeader } from "~/components/admin/AdminHeader";
import { RoleReputationControls } from "~/components/admin/RoleReputationControls";
import { ROLE_ICONS, RoleStatus } from "~/components/AccountRoles";
import { Avatar } from "~/components/Avatar";
import { Pager } from "~/components/Pager";
import { Alert, Button, Select } from "~/components/ui";
import { requireAdmin, updateReputation } from "~/lib/admin.server";
import type { Route } from "./+types/reputation";

export const meta = () => [{ title: "Reputation · Admin · Greyboards" }];

const KINDS: { value: AccountRoleKind; label: string }[] = [
	{ value: "dispatch", label: "Dispatchers" },
	{ value: "scout", label: "Scouts" },
	{ value: "owner", label: "Board owners" },
	{ value: "advertiser", label: "Advertisers" },
];

const BADGE_FILTERS: { value: BadgeKey; label: string }[] = [
	{ value: "verified", label: "Verified by staff" },
	{ value: "proven", label: "Proven" },
];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api, user } = await requireAdmin(request, context, "reputation.manage");
	const params = new URL(request.url).searchParams;
	const kind = KINDS.find((entry) => entry.value === params.get("kind"))?.value;
	const badge = BADGE_FILTERS.find((entry) => entry.value === params.get("badge"))?.value;
	const result = await api.admin.accountRoles({ kind, badge, status: "active", sort: "reputation", page: Number(params.get("page")) || 1 });

	return { roles: result.data, meta: result.meta, me: user.id, canSeeUsers: user.permissions.includes("users.view") };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireAdmin(request, context, "reputation.manage");

	return updateReputation(api, await request.formData());
}

/** Staff verify active roles by hand and correct scores, highest reputation first. */
export default function AdminReputation({ loaderData, actionData }: Route.ComponentProps) {
	const { roles, meta, me, canSeeUsers } = loaderData;
	const [params] = useSearchParams();
	const navigation = useNavigation();

	return (
		<>
			<AdminHeader
				title="Reputation"
				description="Verify people you have checked yourself, and correct scores when something went wrong. Proven badges come from the milestones in Configuration."
			/>
			<div className="space-y-6 px-4 py-8 sm:px-8">
				<Form method="get" className="flex flex-wrap items-center gap-3">
					<Select name="kind" defaultValue={params.get("kind") ?? ""} aria-label="Role" className="w-auto">
						<option value="">Every role</option>
						{KINDS.map((kind) => (
							<option key={kind.value} value={kind.value}>
								{kind.label}
							</option>
						))}
					</Select>
					<Select name="badge" defaultValue={params.get("badge") ?? ""} aria-label="Badge" className="w-auto">
						<option value="">Any badge or none</option>
						{BADGE_FILTERS.map((badge) => (
							<option key={badge.value} value={badge.value}>
								{badge.label}
							</option>
						))}
					</Select>
					<Button type="submit" variant="secondary">
						Show
					</Button>
					<Link to="/reputation" className="text-sm font-semibold text-brand-600 hover:underline">
						What people see about badges
					</Link>
				</Form>

				{actionData?.error && <Alert>{actionData.error}</Alert>}

				<div className="panel">
					{roles.length ? (
						<ul className="divide-y divide-surface-200">
							{roles.map((role) => {
								const Icon = ROLE_ICONS[role.kind];

								return (
									<li key={role.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
										{role.user && <Avatar user={role.user} />}
										<div className="min-w-0 flex-1">
											{role.user && canSeeUsers ? (
												<Link to={`/admin/users/${role.user.id}`} className="font-semibold text-ink-900 hover:underline">
													{role.user.name}
												</Link>
											) : (
												<span className="font-semibold text-ink-900">{role.user?.name ?? "An account"}</span>
											)}
											<p className="flex items-center gap-1.5 text-sm text-ink-500">
												<Icon className="h-4 w-4" aria-hidden />
												{role.label}
											</p>
										</div>
										<RoleStatus status={role.status} />
										<RoleReputationControls role={role} history={[]} canManage={role.user?.id !== me} busy={navigation.state !== "idle"} />
									</li>
								);
							})}
						</ul>
					) : (
						<p className="px-5 py-10 text-center text-sm text-ink-500">Nobody here yet.</p>
					)}
				</div>

				<Pager meta={meta} noun="roles" />
			</div>
		</>
	);
}
