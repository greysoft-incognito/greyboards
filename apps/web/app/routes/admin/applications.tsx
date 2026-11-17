import { Form, Link, useNavigation, useSearchParams } from "react-router";
import { Check, Pause, X } from "lucide-react";
import type { AccountRoleKind, AccountRoleReview, AccountRoleStatus, AdminAccountRole } from "@greyboards/types";
import { AdminHeader } from "~/components/admin/AdminHeader";
import { Pager } from "~/components/admin/Pager";
import { ROLE_ICONS, RoleStatus } from "~/components/AccountRoles";
import { Avatar } from "~/components/Avatar";
import { Alert, Button, Input, Select } from "~/components/ui";
import { formError } from "~/lib/api.server";
import { requireAdmin } from "~/lib/admin.server";
import { useToastMessage } from "~/lib/toast";
import type { Route } from "./+types/applications";

export const meta = () => [{ title: "Applications · Admin · Greyboards" }];

const KINDS: { value: AccountRoleKind; label: string }[] = [
	{ value: "scout", label: "Scouts" },
	{ value: "billposter", label: "Billposters" },
	{ value: "owner", label: "Board owners" },
	{ value: "advertiser", label: "Advertisers" },
];

const STATUSES: { value: AccountRoleStatus; label: string }[] = [
	{ value: "pending", label: "Waiting for review" },
	{ value: "active", label: "Active" },
	{ value: "rejected", label: "Not approved" },
	{ value: "suspended", label: "Suspended" },
];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireAdmin(request, context, "partners.review");
	const params = new URL(request.url).searchParams;
	const kind = KINDS.find((entry) => entry.value === params.get("kind"))?.value;
	const status = STATUSES.find((entry) => entry.value === params.get("status"))?.value ?? "pending";
	const result = await api.admin.accountRoles({ kind, status, page: Number(params.get("page")) || 1 });

	return { applications: result.data, meta: result.meta, status };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireAdmin(request, context, "partners.review");
	const form = await request.formData();
	const review = { status: String(form.get("status")), note: String(form.get("note") ?? "") || null } as AccountRoleReview;

	try {
		const { data } = await api.admin.reviewAccountRole(String(form.get("id")), review);

		return { error: null, message: `${data.user?.name ?? "The account"} is now ${review.status} as ${data.label.toLowerCase()}.` };
	} catch (error) {
		return { error: formError(error).error, message: null };
	}
}

/** Reviewers approve, reject or suspend people who apply to scout or print and post. */
export default function AdminApplications({ loaderData, actionData }: Route.ComponentProps) {
	useToastMessage(actionData);

	const { applications, meta, status } = loaderData;
	const [params] = useSearchParams();

	return (
		<>
			<AdminHeader title="Applications" description="Scouts and billposters handle other people's boards and money, so each one is checked before they start." />
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
					<Select name="status" defaultValue={status} aria-label="Status" className="w-auto">
						{STATUSES.map((entry) => (
							<option key={entry.value} value={entry.value}>
								{entry.label}
							</option>
						))}
					</Select>
					<Button type="submit" variant="secondary">
						Show
					</Button>
				</Form>

				{actionData?.error && <Alert>{actionData.error}</Alert>}

				<div className="panel">
					{applications.length ? (
						<ul className="divide-y divide-surface-200">
							{applications.map((application) => (
								<ApplicationRow key={application.id} application={application} />
							))}
						</ul>
					) : (
						<p className="px-5 py-10 text-center text-sm text-ink-500">Nothing here right now.</p>
					)}
				</div>

				<Pager meta={meta} noun="applications" />
			</div>
		</>
	);
}

function ApplicationRow({ application }: { application: AdminAccountRole }) {
	const navigation = useNavigation();
	const busy = navigation.state !== "idle" && navigation.formData?.get("id") === application.id;
	const Icon = ROLE_ICONS[application.kind];
	const decisions: { status: AccountRoleReview["status"]; label: string; icon: typeof Check; variant: "primary" | "secondary" | "danger" }[] = [
		{ status: "active", label: "Approve", icon: Check, variant: "primary" },
		{ status: "rejected", label: "Reject", icon: X, variant: "secondary" },
		{ status: "suspended", label: "Suspend", icon: Pause, variant: "danger" },
	];

	return (
		<li className="space-y-3 px-5 py-4">
			<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
				{application.user && <Avatar user={application.user} />}
				<div className="min-w-0 flex-1 basis-56">
					<p className="truncate text-sm font-semibold text-ink-900">
						{application.user ? (
							<Link prefetch="intent" to={`/admin/users/${application.user.id}`} className="hover:text-brand-700 hover:underline">
								{application.user.name}
							</Link>
						) : (
							"Deleted account"
						)}
					</p>
					<p className="truncate text-sm text-ink-500">{application.user?.email}</p>
				</div>
				<span className="flex items-center gap-2 text-sm font-medium text-ink-700">
					<Icon className="h-4 w-4 text-ink-500" aria-hidden />
					{application.label}
				</span>
				<RoleStatus status={application.status} />
				<span className="text-sm text-ink-500">Applied {new Date(application.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
			</div>
			<Form method="post" preventScrollReset className="flex flex-wrap items-center gap-2">
				<input type="hidden" name="id" value={application.id} />
				<Input name="note" defaultValue={application.note ?? ""} maxLength={191} placeholder="Note for the applicant (optional)" aria-label="Note" className="!py-2 text-sm sm:max-w-sm" />
				{decisions
					.filter((decision) => decision.status !== application.status)
					.map((decision) => (
						<Button key={decision.status} type="submit" name="status" value={decision.status} variant={decision.variant} disabled={busy} className="!py-2">
							<decision.icon className="h-4 w-4" aria-hidden />
							{decision.label}
						</Button>
					))}
			</Form>
		</li>
	);
}
