import { Form, Link, useNavigation, useSearchParams } from "react-router";
import { BadgeCheck, Check, CircleAlert, IdCard, Landmark, Pause, X } from "lucide-react";
import type { AccountRoleKind, AccountRoleReview, AccountRoleStatus, AdminAccountRole, IdentityReview, PartnerChecks, PartnerRequirement } from "@greyboards/types";
import { AdminHeader } from "~/components/admin/AdminHeader";
import { Pager } from "~/components/Pager";
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
	{ value: "dispatch", label: "Dispatchers" },
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

	if (form.get("intent") === "identity") {
		const decision = { status: String(form.get("status")), note: String(form.get("note") ?? "") || null } as IdentityReview;

		try {
			return { error: null, message: (await api.admin.reviewIdentity(String(form.get("id")), decision)).message };
		} catch (error) {
			return { error: formError(error).error, message: null };
		}
	}

	const review = { status: String(form.get("status")), note: String(form.get("note") ?? "") || null } as AccountRoleReview;

	try {
		const { data } = await api.admin.reviewAccountRole(String(form.get("id")), review);

		const name = data.user?.name ?? "This person";
		const outcome = { active: "approved", rejected: "declined", suspended: "suspended", pending: "moved back to review" }[review.status] ?? review.status;

		return { error: null, message: `${name}'s ${data.label.toLowerCase()} application was ${outcome}.` };
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
			<AdminHeader title="Applications" description="Scouts and dispatchers work with other people's boards, so we review each one before they start." />
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

/** Each requirement as a reviewer reads it. */
const STILL_NEEDED: Record<PartnerRequirement, string> = {
	identity: "a photo of their ID",
	bank: "a bank account",
};

function ApplicationRow({ application }: { application: AdminAccountRole }) {
	const navigation = useNavigation();
	const blocked = (application.checks?.missing.length ?? 0) > 0;
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
			{application.checks && <Checks id={application.id} checks={application.checks} />}
			<Form method="post" preventScrollReset className="flex flex-wrap items-center gap-2">
				<input type="hidden" name="id" value={application.id} />
				<Input name="note" defaultValue={application.note ?? ""} maxLength={191} placeholder="Note for the applicant (optional)" aria-label="Note" className="!py-2 text-sm sm:max-w-sm" />
				{decisions
					.filter((decision) => decision.status !== application.status)
					.map((decision) => (
						<Button
							key={decision.status}
							type="submit"
							name="status"
							value={decision.status}
							variant={decision.variant}
							disabled={busy || (decision.status === "active" && blocked)}
							title={decision.status === "active" && blocked ? "They need to send what's missing first" : undefined}
							className="!py-2"
						>
							<decision.icon className="h-4 w-4" aria-hidden />
							{decision.label}
						</Button>
					))}
			</Form>
		</li>
	);
}

const ID_STATUS: Record<NonNullable<PartnerChecks["identity"]>["status"], string> = {
	submitted: "Not reviewed",
	verified: "Checked",
	rejected: "Not approved",
};

/** The applicant's ID and bank account side by side, so the names can be compared. */
function Checks({ id, checks }: { id: string; checks: PartnerChecks }) {
	const identity = checks.identity;

	return (
		<div className="grid gap-3 rounded-2xl bg-surface-100 p-4 text-sm sm:grid-cols-[auto_1fr_1fr]">
			{identity?.photoUrl ? (
				<a href={identity.photoUrl} target="_blank" rel="noreferrer" className="block h-24 w-36 overflow-hidden rounded-xl ring-1 ring-surface-200">
					<img src={identity.photoUrl} alt={`${identity.documentLabel} sent by the applicant`} className="h-full w-full object-cover" />
				</a>
			) : (
				<span className="flex h-24 w-36 items-center justify-center rounded-xl bg-white text-ink-500 ring-1 ring-surface-200">
					<IdCard className="h-6 w-6" aria-hidden />
				</span>
			)}
			<div>
				<p className="flex items-center gap-1.5 font-semibold text-ink-900">
					<IdCard className="h-4 w-4 text-ink-500" aria-hidden />
					ID
				</p>
				{identity ? (
					<>
						<p className="text-ink-700">{identity.fullName}</p>
						<p className="text-ink-500 tabular-nums">
							{identity.documentLabel} · {identity.documentNumber}
						</p>
						<p className="text-ink-500">
							{ID_STATUS[identity.status]}
							{identity.note ? `: ${identity.note}` : ""}
						</p>
						{identity.status !== "rejected" && (
							<Form method="post" preventScrollReset className="mt-2 flex flex-wrap gap-2">
								<input type="hidden" name="intent" value="identity" />
								<input type="hidden" name="id" value={id} />
								<input type="hidden" name="note" value="We couldn't read the photo. Please upload a clearer one." />
								{identity.status !== "verified" && (
									<Button type="submit" name="status" value="verified" variant="secondary" className="!min-h-9 !py-1.5">
										<BadgeCheck className="h-4 w-4" aria-hidden />
										Approve ID
									</Button>
								)}
								<Button type="submit" name="status" value="rejected" variant="ghost" className="!min-h-9 !py-1.5">
									<X className="h-4 w-4" aria-hidden />
									Ask for a clearer photo
								</Button>
							</Form>
						)}
					</>
				) : (
					<p className="text-ink-500">Not sent yet.</p>
				)}
			</div>
			<div>
				<p className="flex items-center gap-1.5 font-semibold text-ink-900">
					<Landmark className="h-4 w-4 text-ink-500" aria-hidden />
					Bank account
				</p>
				{checks.bank ? (
					<>
						<p className="text-ink-700">{checks.bank.accountName}</p>
						<p className="text-ink-500 tabular-nums">
							{checks.bank.bankName} {checks.bank.maskedNumber}
						</p>
					</>
				) : (
					<p className="text-ink-500">Not added yet.</p>
				)}
				{checks.namesMatch !== null && (
					<p className={`mt-1 flex items-center gap-1.5 font-medium ${checks.namesMatch ? "text-available" : "text-held"}`}>
						{checks.namesMatch ? <Check className="h-4 w-4" aria-hidden /> : <CircleAlert className="h-4 w-4" aria-hidden />}
						{checks.namesMatch ? "Name matches the ID" : "Name doesn't match the ID"}
					</p>
				)}
			</div>
			{checks.missing.length > 0 && (
				<p className="flex items-center gap-1.5 font-medium text-held sm:col-span-3">
					<CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
					Can't be approved until they add {checks.missing.map((item) => STILL_NEEDED[item]).join(" and ")}. We've shown them what's left.
				</p>
			)}
		</div>
	);
}
