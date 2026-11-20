import { Form, useNavigation } from "react-router";
import type { AccountRoleKind, IdentityDocument, ReputationEvent } from "@greyboards/types";
import { requireSignIn, requireUser } from "~/lib/session.server";
import { settingsAction } from "~/lib/settings.server";
import { useToastMessage } from "~/lib/toast";
import { Alert, Button } from "~/components/ui";
import { ROLE_ICONS, RoleStatus, heldRole, missingWords } from "~/components/AccountRoles";
import { PageHeader, resultFor } from "~/components/settings/Section";
import { ApplicationChecklist } from "~/components/settings/ApplicationChecklist";
import { PartnerChecksPanel } from "~/components/settings/PartnerChecksPanel";
import { Standing } from "~/components/reputation/Badges";
import { RoleReputationPanel } from "~/components/reputation/RoleReputationPanel";
import { postedPhoto } from "~/lib/boards.server";
import type { Route } from "./+types/roles";

export const meta = () => [{ title: "How you use Greyboards · Settings · Greyboards" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireSignIn(request, context);
	const [{ user }, roles] = await Promise.all([requireUser(request, context), api.account.roles()]);
	const reviewed = roles.definitions.filter((definition) => definition.needsReview).map((definition) => definition.kind);
	const applying = roles.data.some((role) => reviewed.includes(role.kind));
	const checks = applying ? await api.account.partnerChecks().catch(() => null) : null;
	const histories = await Promise.all(
		roles.data.map(async (role) => [role.kind, (await api.account.reputation(role.kind, { per_page: 5 }).catch(() => null))?.data ?? []] as const),
	);

	return {
		roles: roles.data,
		definitions: roles.definitions,
		name: user.name,
		checks: checks?.data ?? null,
		documents: checks?.documents ?? [],
		histories: Object.fromEntries(histories) as Partial<Record<AccountRoleKind, ReputationEvent[]>>,
	};
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireSignIn(request, context);
	const form = await request.formData();
	const kind = String(form.get("kind")) as AccountRoleKind;

	if (form.get("intent") === "send-id") {
		const photo = postedPhoto(form);

		if (!photo) return { intent: "send-id", error: "Add a photo of your ID.", message: null, fieldErrors: {} as Record<string, string> };

		return settingsAction("send-id", async () => {
			const identity = {
				documentType: String(form.get("documentType")) as IdentityDocument,
				documentNumber: String(form.get("documentNumber") ?? ""),
				fullName: String(form.get("fullName") ?? ""),
			};

			return { message: (await api.account.sendIdentity(identity, photo, photo.name)).message };
		});
	}

	if (form.get("intent") === "drop") {
		return settingsAction(`drop-${kind}`, async () => ({ message: (await api.account.dropRole(kind)).message }));
	}

	return settingsAction(`take-${kind}`, async () => ({ message: (await api.account.takeRole(kind)).message }));
}

/** The marketplace roles the account holds, and taking on or giving up one. */
export default function Roles({ loaderData, actionData }: Route.ComponentProps) {
	useToastMessage(actionData);

	const { roles, definitions, checks, documents, histories } = loaderData;
	const idResult = resultFor(actionData, "send-id");
	const navigation = useNavigation();
	const waiting = roles.some((role) => role.status === "pending" && definitions.some((definition) => definition.kind === role.kind && definition.needsReview));

	return (
		<>
			<PageHeader title="How you use Greyboards" description="Advertisers and board owners can start right away. Scouts and dispatchers get a quick review first." />
			<ul className="space-y-4">
				{definitions.map((definition) => {
					const Icon = ROLE_ICONS[definition.kind];
					const held = heldRole(roles, definition.kind);
					const result = resultFor(actionData, `take-${definition.kind}`) ?? resultFor(actionData, `drop-${definition.kind}`);
					const busy = navigation.state !== "idle" && navigation.formData?.get("kind") === definition.kind;

					return (
						<li key={definition.kind} className="panel p-5 sm:p-6">
							<div className="flex flex-wrap items-start gap-4">
								<span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
									<Icon className="h-6 w-6" aria-hidden />
								</span>
								<div className="min-w-0 flex-1 basis-60">
									<div className="flex flex-wrap items-center gap-2">
										<h2 className="font-display text-xl font-bold text-ink-900">{definition.label}</h2>
										{held && <RoleStatus status={held.status} missing={held.missing} />}
										{held && <Standing standing={held.reputation} showScore={false} />}
									</div>
									<p className="mt-1 text-sm text-ink-500">{definition.description}</p>
									{held?.note && <p className="mt-2 text-sm text-ink-700">Reviewer's note: {held.note}</p>}
									{held?.status === "pending" && held.missing.length > 0 && (
										<p className="mt-2 text-sm text-held">
											Add {missingWords(held.missing)} so we can approve this.{" "}
											<a href="#finish" className="font-semibold text-brand-700 hover:underline">
												See what's left
											</a>
										</p>
									)}
								</div>
								<Form method="post">
									<input type="hidden" name="kind" value={definition.kind} />
									{!held || held.status === "rejected" ? (
										<Button
											type="submit"
											name="intent"
											value="take"
											variant={held ? "secondary" : "primary"}
											disabled={busy}
											confirm={
												definition.needsReview
													? { title: `Apply to be ${definition.label.toLowerCase()}?`, message: "We'll review your application before you can start.", action: "Apply" }
													: { title: `Start as ${definition.label.toLowerCase()}?`, message: definition.description, action: "Start" }
											}
										>
											{held ? "Apply again" : definition.needsReview ? "Apply" : "Start"}
										</Button>
									) : held.status !== "suspended" ? (
										<Button
											type="submit"
											name="intent"
											value="drop"
											variant="ghost"
											disabled={busy}
											confirm={
												held.status === "pending"
													? { title: `Withdraw your ${definition.label.toLowerCase()} application?`, message: "We'll stop reviewing it. You can apply again later.", action: "Withdraw", danger: true }
													: { title: `Stop working as ${definition.label.toLowerCase()}?`, message: "You'll lose access to this part of Greyboards. You can start again later.", action: "Stop", danger: true }
											}
										>
											{held.status === "pending" ? "Withdraw application" : "Stop"}
										</Button>
									) : null}
								</Form>
							</div>
							{held && (held.status === "active" || held.status === "suspended") && <RoleReputationPanel reputation={held.reputation} history={histories[held.kind] ?? []} />}
							{result?.error && (
								<div className="mt-4">
									<Alert>{result.error}</Alert>
								</div>
							)}
						</li>
					);
				})}
			</ul>
			{checks && waiting && (
				<div className="mt-4">
					<ApplicationChecklist checks={checks} />
				</div>
			)}
			{checks && (
				<div className="mt-4">
					<PartnerChecksPanel checks={checks} documents={documents} error={idResult?.error} fieldErrors={idResult?.fieldErrors} />
				</div>
			)}
		</>
	);
}
