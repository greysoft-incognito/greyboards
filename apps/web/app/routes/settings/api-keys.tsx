import { BookOpen, KeyRound } from "lucide-react";
import { Form, Link, useNavigation } from "react-router";
import type { ApiKey, ApiKeyAbility, NewApiKey } from "@greyboards/types";
import { requireSignIn } from "~/lib/session.server";
import { settingsAction } from "~/lib/settings.server";
import { copyText, useToastMessage } from "~/lib/toast";
import { Alert, Button, Field, Input, Spinner } from "~/components/ui";
import { PageHeader, Section, resultFor, type SettingsResult } from "~/components/settings/Section";
import type { Route } from "./+types/api-keys";

export const meta = () => [{ title: "API keys · Settings · Greyboards" }];

const ABILITY_LABELS: Record<ApiKeyAbility, { label: string; hint: string }> = {
	read: { label: "Read", hint: "Search boards, check dates and see your bookings" },
	book: { label: "Book and pay", hint: "Hold dates and pay for bookings" },
};

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireSignIn(request, context);
	const { data: keys } = await api.account.apiKeys();

	return { keys };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireSignIn(request, context);
	const form = await request.formData();

	if (form.get("intent") === "remove") {
		return settingsAction("remove", async () => {
			await api.account.removeApiKey(String(form.get("key") ?? ""));

			return { message: "Key deleted. Anything using it will stop working." };
		});
	}

	const abilities = form.getAll("abilities").map(String) as ApiKeyAbility[];

	return settingsAction<{ created?: NewApiKey }>("create", async () => {
		const { data: created } = await api.account.createApiKey({
			name: String(form.get("name") ?? "").trim(),
			abilities: abilities.includes("book") ? ["read", "book"] : ["read"],
		});

		return { message: "Key created. Copy it now.", created };
	});
}

export default function ApiKeysPage({ loaderData, actionData }: Route.ComponentProps) {
	useToastMessage(actionData);

	const navigation = useNavigation();
	const creating = navigation.state !== "idle" && navigation.formData?.get("intent") === "create";
	const created = (actionData as { created?: NewApiKey } | undefined)?.created;
	const createResult = resultFor(actionData ?? undefined, "create");

	return (
		<>
			<PageHeader
				title="API keys"
				description="Use the Greyboards API to search and book boards from your own tools. Keep your keys secret, since anyone with one can act as you."
			/>
			<div className="space-y-6">
				{created && <NewKey created={created} />}
				<Section title="Make a key" description="Name it after the tool that will use it.">
					<Form method="post" className="space-y-4">
						<input type="hidden" name="intent" value="create" />
						{createResult?.error && <Alert>{createResult.error}</Alert>}
						<Field label="Name" error={createResult?.fieldErrors?.name}>
							<Input name="name" required minLength={2} maxLength={60} placeholder="Such as: Media planning sheet" />
						</Field>
						<fieldset className="space-y-2">
							<legend className="mb-1.5 text-sm font-semibold text-ink-900">What it can do</legend>
							{(Object.keys(ABILITY_LABELS) as ApiKeyAbility[]).map((ability) => (
								<label key={ability} className="flex items-start gap-3 rounded-2xl border-[1.5px] border-surface-200 px-4 py-3 text-sm">
									<input
										type="checkbox"
										name="abilities"
										value={ability}
										defaultChecked={ability === "read"}
										disabled={ability === "read"}
										className="mt-1 accent-brand-500"
									/>
									<span>
										<span className="block font-semibold text-ink-900">{ABILITY_LABELS[ability].label}</span>
										<span className="block text-ink-500">{ABILITY_LABELS[ability].hint}</span>
									</span>
								</label>
							))}
						</fieldset>
						<Button type="submit" disabled={creating}>
							{creating ? <Spinner /> : <KeyRound className="h-4 w-4" aria-hidden />}
							Make key
						</Button>
					</Form>
				</Section>
				<Keys keys={loaderData.keys} result={resultFor(actionData ?? undefined, "remove")} />
				<Link prefetch="intent" to="/developers" className="flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline">
					<BookOpen className="h-4 w-4 shrink-0" aria-hidden />
					Read the developer docs
				</Link>
			</div>
		</>
	);
}

function NewKey({ created }: { created: NewApiKey }) {
	return (
		<Section title={`${created.name} is ready`} description="Copy it now. You won't be able to see it again.">
			<p className="break-all rounded-xl bg-surface-100 p-4 font-mono text-sm text-ink-900">{created.token}</p>
			<Button variant="secondary" className="mt-4" onClick={() => copyText(created.token, "Key copied.")}>
				Copy key
			</Button>
		</Section>
	);
}

function Keys({ keys, result }: { keys: ApiKey[]; result?: SettingsResult }) {
	if (keys.length === 0) {
		return (
			<Section>
				<p className="text-sm text-ink-500">No keys yet.</p>
			</Section>
		);
	}

	return (
		<Section title="Your keys">
			{result?.error && <div className="mb-4"><Alert>{result.error}</Alert></div>}
			<ul className="divide-y divide-surface-200">
				{keys.map((key) => (
					<li key={key.id} className="flex items-center gap-4 py-4 first:pt-0">
						<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-100 text-ink-700">
							<KeyRound className="h-5 w-5" aria-hidden />
						</span>
						<div className="min-w-0 flex-1">
							<p className="font-medium text-ink-900">{key.name}</p>
							<p className="text-sm text-ink-500">
								<span className="font-mono">{key.prefix}…</span> · {key.abilities.includes("book") ? "Read, book and pay" : "Read only"} ·{" "}
								{key.lastUsedAt ? `Last used ${new Date(key.lastUsedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}` : "Not used yet"}
							</p>
						</div>
						<Form method="post">
							<input type="hidden" name="key" value={key.id} />
							<Button variant="ghost" type="submit" name="intent" value="remove" className="text-red-700">
								Remove
							</Button>
						</Form>
					</li>
				))}
			</ul>
		</Section>
	);
}
