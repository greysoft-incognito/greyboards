import { useNavigation } from "react-router";
import { AccountControls } from "~/components/admin/AccountControls";
import { AdminHeader } from "~/components/admin/AdminHeader";
import { ROLE_ICONS, RoleStatus } from "~/components/AccountRoles";
import { Avatar } from "~/components/Avatar";
import { Alert } from "~/components/ui";
import { requireAdmin, updateAccount } from "~/lib/admin.server";
import type { Route } from "./+types/user";

export const meta = ({ loaderData }: Route.MetaArgs) => [{ title: `${loaderData?.account.name ?? "Account"} · Admin · Greyboards` }];

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const { api, user } = await requireAdmin(request, context, "users.view", "users.manage");
	const [account, roles] = await Promise.all([api.admin.user(params.id), api.admin.roles()]);

	return {
		account: account.data,
		roles: roles.data,
		isMe: user.id === params.id,
		canManage: user.permissions.includes("users.manage"),
	};
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireAdmin(request, context, "users.manage");

	return updateAccount(api, await request.formData());
}

export default function AdminUserPage({ loaderData, actionData }: Route.ComponentProps) {
	const { account, roles, isMe, canManage } = loaderData;
	const navigation = useNavigation();
	const role = roles.find((entry) => entry.slug === account.role)?.name ?? account.role;

	return (
		<>
			<AdminHeader
				title={account.name}
				description={`${account.email}${account.emailVerified ? "" : " (unconfirmed)"} · ${role} · joined ${new Date(account.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}`}
				back={{ to: "/admin/users", label: "All users" }}
			>
				{canManage && <AccountControls account={account} roles={roles} isMe={isMe} busy={navigation.state !== "idle"} />}
			</AdminHeader>
			<div className="space-y-6 px-4 py-8 sm:px-8">
				{actionData?.error && <Alert>{actionData.error}</Alert>}

				<div className="flex items-center gap-3">
					<Avatar user={account} />
					{account.suspended && <p className="text-sm text-ink-500">Suspended.</p>}
				</div>

				<section className="panel">
					<h2 className="border-b-[1.5px] border-surface-200 px-5 py-4 font-display text-lg font-bold text-ink-900">Works as</h2>
					{account.accountRoles.length ? (
						<ul className="divide-y divide-surface-200">
							{account.accountRoles.map((held) => {
								const Icon = ROLE_ICONS[held.kind];

								return (
									<li key={held.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
										<Icon className="h-5 w-5 text-ink-500" aria-hidden />
										<span className="flex-1 font-medium text-ink-900">{held.label}</span>
										{held.note && <span className="text-sm text-ink-500">{held.note}</span>}
										<RoleStatus status={held.status} />
									</li>
								);
							})}
						</ul>
					) : (
						<p className="px-5 py-4 text-sm text-ink-500">No marketplace roles yet.</p>
					)}
				</section>
			</div>
		</>
	);
}
