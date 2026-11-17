import { Form, useNavigation } from "react-router";
import type { AccountRoleKind } from "@greyboards/types";
import { requireSignIn, requireUser } from "~/lib/session.server";
import { settingsAction } from "~/lib/settings.server";
import { useToastMessage } from "~/lib/toast";
import { Alert, Button } from "~/components/ui";
import { ROLE_ICONS, RoleStatus, heldRole } from "~/components/AccountRoles";
import { PageHeader, resultFor } from "~/components/settings/Section";
import type { Route } from "./+types/roles";

export const meta = () => [{ title: "How you use Greyboards · Settings · Greyboards" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireSignIn(request, context);
	const [{ user }, roles] = await Promise.all([requireUser(request, context), api.account.roles()]);

	return { roles: roles.data, definitions: roles.definitions, name: user.name };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireSignIn(request, context);
	const form = await request.formData();
	const kind = String(form.get("kind")) as AccountRoleKind;

	if (form.get("intent") === "drop") {
		return settingsAction(`drop-${kind}`, async () => ({ message: (await api.account.dropRole(kind)).message }));
	}

	return settingsAction(`take-${kind}`, async () => ({ message: (await api.account.takeRole(kind)).message }));
}

/** The marketplace roles the account holds, and taking on or giving up one. */
export default function Roles({ loaderData, actionData }: Route.ComponentProps) {
	useToastMessage(actionData);

	const { roles, definitions } = loaderData;
	const navigation = useNavigation();

	return (
		<>
			<PageHeader title="How you use Greyboards" description="One account can do several things. Advertisers and board owners can start at once; scouts and billposters are checked first." />
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
										{held && <RoleStatus status={held.status} />}
									</div>
									<p className="mt-1 text-sm text-ink-500">{definition.description}</p>
									{held?.note && <p className="mt-2 text-sm text-ink-700">Reviewer's note: {held.note}</p>}
								</div>
								<Form method="post">
									<input type="hidden" name="kind" value={definition.kind} />
									{!held || held.status === "rejected" ? (
										<Button type="submit" name="intent" value="take" variant={held ? "secondary" : "primary"} disabled={busy}>
											{held ? "Apply again" : definition.needsReview ? "Apply" : "Start"}
										</Button>
									) : held.status !== "suspended" ? (
										<Button type="submit" name="intent" value="drop" variant="ghost" disabled={busy}>
											{held.status === "pending" ? "Withdraw" : "Stop"}
										</Button>
									) : null}
								</Form>
							</div>
							{result?.error && (
								<div className="mt-4">
									<Alert>{result.error}</Alert>
								</div>
							)}
						</li>
					);
				})}
			</ul>
		</>
	);
}
