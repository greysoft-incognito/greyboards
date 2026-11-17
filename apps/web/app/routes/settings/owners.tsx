import { useState } from "react";
import { Form, useNavigation } from "react-router";
import { BadgeCheck, MessageSquareText, Pencil, Plus, Presentation } from "lucide-react";
import type { OwnerProfile } from "@greyboards/types";
import { Alert, Button, Field, Input, OtpInput, Spinner } from "~/components/ui";
import { PageHeader, Section, resultFor } from "~/components/settings/Section";
import { requireUser } from "~/lib/session.server";
import { settingsAction } from "~/lib/settings.server";
import { useToastMessage } from "~/lib/toast";
import type { Route } from "./+types/owners";

export const meta = () => [{ title: "Board owners · Settings · Greyboards" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api, user } = await requireUser(request, context);
	const { data: profiles } = await api.account.ownerProfiles({ per_page: 100 });

	return { profiles, isOwner: user.accountRoles.some((role) => role.kind === "owner" && role.status === "active") };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireUser(request, context);
	const form = await request.formData();
	const intent = String(form.get("intent"));
	const phone = String(form.get("phone") ?? "");

	switch (intent) {
		case "claim":
			return settingsAction(intent, async () => {
				await api.account.claimOwnerProfile({ phone });

				return { message: "We've texted a code to that number.", phone };
			}, { phone: null });
		case "verify":
			return settingsAction(intent, async () => {
				const { data } = await api.account.verifyOwnerClaim({ phone, code: String(form.get("code") ?? "") });

				return { message: `You now manage ${data.name}'s boards.`, phone: null };
			}, { phone });
		case "rename":
			return settingsAction(intent, async () => {
				await api.account.updateOwnerProfile(String(form.get("id")), { name: String(form.get("name") ?? "") });

				return { message: "Saved." };
			});
		default:
			return settingsAction("add", async () => {
				await api.account.createOwnerProfile({ name: String(form.get("name") ?? "") });

				return { message: "Owner added." };
			});
	}
}

/** The board owners this account manages, adding more, and claiming a profile a scout made. */
export default function Owners({ loaderData, actionData }: Route.ComponentProps) {
	useToastMessage(actionData);

	const { profiles, isOwner } = loaderData;
	const navigation = useNavigation();
	const busy = (intent: string) => navigation.state !== "idle" && navigation.formData?.get("intent") === intent;
	const claim = resultFor(actionData, "claim");
	const verify = resultFor(actionData, "verify");
	const add = resultFor(actionData, "add");
	const claimingPhone = ((claim && !claim.error ? claim : verify?.error ? verify : null) as { phone?: string | null } | null)?.phone ?? null;

	return (
		<>
			<PageHeader title="Board owners" description="The owners whose boards you look after. An agency can manage several, and each board belongs to one." />
			<div className="space-y-6">
				<Section>
					{profiles.length ? (
						<ul className="divide-y divide-surface-200">
							{profiles.map((profile) => (
								<OwnerRow key={profile.id} profile={profile} />
							))}
						</ul>
					) : (
						<p className="text-sm text-ink-500">You don't manage any owners yet. Tag your own board, or claim boards a scout listed under your number below.</p>
					)}
					{isOwner && (
						<Form method="post" className="mt-6 flex flex-wrap items-end gap-2 border-t border-surface-200 pt-6">
							<input type="hidden" name="intent" value="add" />
							<div className="min-w-0 flex-1 basis-60">
								<Field label="Add an owner you manage" error={add?.fieldErrors?.name ?? add?.error ?? undefined} hint="Such as a client whose boards your agency runs.">
									<Input name="name" required minLength={2} maxLength={120} placeholder="Client Ltd" />
								</Field>
							</div>
							<Button type="submit" variant="secondary" disabled={busy("add")} className="mb-[1.375rem]">
								<Plus className="h-4 w-4" aria-hidden />
								Add owner
							</Button>
						</Form>
					)}
				</Section>

				<Section title="Claim your boards" description="If a scout listed your boards under your phone number, prove it's yours and you'll manage them here.">
					{claimingPhone ? (
						<Form method="post" className="space-y-4">
							<input type="hidden" name="intent" value="verify" />
							<input type="hidden" name="phone" value={claimingPhone} />
							{verify?.error && <Alert>{verify.error}</Alert>}
							<div>
								<span className="mb-1.5 block text-sm font-semibold text-ink-900">Code we texted to {claimingPhone}</span>
								<OtpInput name="code" autoFocus invalid={!!verify?.error} disabled={busy("verify")} />
							</div>
							<Button type="submit" disabled={busy("verify")}>
								{busy("verify") ? <Spinner /> : <BadgeCheck className="h-4 w-4" aria-hidden />}
								Claim
							</Button>
						</Form>
					) : (
						<Form method="post" className="flex flex-wrap items-end gap-2">
							<input type="hidden" name="intent" value="claim" />
							<div className="min-w-0 flex-1 basis-60">
								<Field label="Your phone number" error={claim?.fieldErrors?.phone ?? claim?.error ?? undefined}>
									<Input name="phone" type="tel" required maxLength={20} placeholder="+234 803 000 0000" />
								</Field>
							</div>
							<Button type="submit" disabled={busy("claim")} className="mb-[1.375rem]">
								{busy("claim") ? <Spinner /> : <MessageSquareText className="h-4 w-4" aria-hidden />}
								Text me a code
							</Button>
						</Form>
					)}
				</Section>
			</div>
		</>
	);
}

function OwnerRow({ profile }: { profile: OwnerProfile }) {
	const [editing, setEditing] = useState(false);
	const navigation = useNavigation();
	const busy = navigation.formData?.get("id") === profile.id;

	return (
		<li className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
			<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
				<Presentation className="h-5 w-5" aria-hidden />
			</span>
			{editing ? (
				<Form method="post" className="flex min-w-0 flex-1 flex-wrap items-center gap-2" onSubmit={() => setEditing(false)}>
					<input type="hidden" name="intent" value="rename" />
					<input type="hidden" name="id" value={profile.id} />
					<Input name="name" defaultValue={profile.name} required minLength={2} maxLength={120} autoFocus className="!py-2 min-w-0 flex-1 basis-48" aria-label="Owner name" />
					<Button type="submit" disabled={busy} className="!py-2">
						Save
					</Button>
					<Button variant="ghost" onClick={() => setEditing(false)} className="!py-2">
						Cancel
					</Button>
				</Form>
			) : (
				<>
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-semibold text-ink-900">{profile.name}</p>
						<p className="text-sm text-ink-500 tabular-nums">{profile.phone ?? "No phone number"}{profile.phoneVerifiedAt ? " · confirmed" : ""}</p>
					</div>
					<Button variant="ghost" onClick={() => setEditing(true)} className="!py-2">
						<Pencil className="h-4 w-4" aria-hidden />
						Rename
					</Button>
				</>
			)}
		</li>
	);
}
