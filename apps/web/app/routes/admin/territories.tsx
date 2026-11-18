import { Form, useNavigation } from "react-router";
import { MapPinned, Plus, Trash2 } from "lucide-react";
import { AdminHeader } from "~/components/admin/AdminHeader";
import { Pager } from "~/components/Pager";
import { Alert, Button, Field, Input, Spinner } from "~/components/ui";
import { requireAdmin } from "~/lib/admin.server";
import { formError } from "~/lib/api.server";
import { useToastMessage } from "~/lib/toast";
import type { Route } from "./+types/territories";

export const meta = () => [{ title: "Territories · Admin · Greyboards" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireAdmin(request, context, "partners.review");
	const result = await api.admin.territories({ page: Number(new URL(request.url).searchParams.get("page")) || 1 });

	return { territories: result.data, meta: result.meta };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireAdmin(request, context, "partners.review");
	const form = await request.formData();

	try {
		if (form.get("intent") === "remove") {
			await api.admin.removeTerritory(String(form.get("id")));

			return { error: null, message: "Territory removed." };
		}

		await api.admin.createTerritory({
			name: String(form.get("name") ?? ""),
			latitude: Number(form.get("latitude")),
			longitude: Number(form.get("longitude")),
			radiusM: Math.round(Number(form.get("radiusKm")) * 1000),
			scoutEmail: String(form.get("scoutEmail") ?? "").trim() || null,
		});

		return { error: null, message: "Territory added." };
	} catch (error) {
		return { error: formError(error).error, message: null };
	}
}

/** Areas given to scouts so two don't chase the same owner. Enforcing them is a scouting setting. */
export default function AdminTerritories({ loaderData, actionData }: Route.ComponentProps) {
	useToastMessage(actionData);

	const { territories, meta } = loaderData;
	const navigation = useNavigation();
	const adding = navigation.formData?.get("intent") === "add";
	const removing = navigation.formData?.get("intent") === "remove" ? navigation.formData.get("id") : null;

	return (
		<>
			<AdminHeader title="Territories" description="Areas assigned to scouts. If territories are turned on in scouting settings, scouts can only add boards in their own area or one nobody holds." />
			<div className="grid gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[1fr_22rem]">
				<section className="space-y-3">
					{actionData?.error && <Alert>{actionData.error}</Alert>}
					{territories.length ? (
						<ul className="panel divide-y divide-surface-100">
							{territories.map((territory) => (
								<li key={territory.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
									<div className="flex items-start gap-3">
										<MapPinned className="mt-0.5 h-5 w-5 text-brand-700" aria-hidden />
										<div>
											<p className="font-semibold text-ink-900">{territory.name}</p>
											<p className="text-sm text-ink-500 tabular-nums">
												{(territory.radiusM / 1000).toFixed(1)} km around {territory.latitude.toFixed(4)}, {territory.longitude.toFixed(4)}
											</p>
											<p className="text-sm text-ink-700">{territory.scout ? `${territory.scout.name} · ${territory.scout.email}` : "Open to any scout"}</p>
										</div>
									</div>
									<Form method="post">
										<input type="hidden" name="id" value={territory.id} />
										<Button type="submit" name="intent" value="remove" variant="ghost" className="!py-2 text-red-700" disabled={removing === territory.id} aria-label={`Remove ${territory.name}`}>
											{removing === territory.id ? <Spinner /> : <Trash2 className="h-4 w-4" aria-hidden />}
										</Button>
									</Form>
								</li>
							))}
						</ul>
					) : (
						<p className="panel px-5 py-10 text-center text-sm text-ink-500">No territories yet.</p>
					)}
					<Pager meta={meta} noun="territories" />
				</section>

				<section className="panel h-fit space-y-3 p-5">
					<h2 className="font-display text-lg font-extrabold tracking-tight text-ink-900">Add a territory</h2>
					<Form method="post" className="space-y-3">
						<input type="hidden" name="intent" value="add" />
						<Field label="Name">
							<Input name="name" required minLength={2} maxLength={120} placeholder="Such as: Wuse 2" />
						</Field>
						<div className="grid grid-cols-2 gap-3">
							<Field label="Latitude">
								<Input name="latitude" type="number" step="any" min="-90" max="90" required />
							</Field>
							<Field label="Longitude">
								<Input name="longitude" type="number" step="any" min="-180" max="180" required />
							</Field>
						</div>
						<Field label="Radius" hint="In km, from 0.1 to 100.">
							<Input name="radiusKm" type="number" step="0.1" min="0.1" max="100" defaultValue="2" required />
						</Field>
						<Field label="Scout’s email" hint="Leave empty to open it to anyone.">
							<Input name="scoutEmail" type="email" />
						</Field>
						<Button type="submit" className="w-full" disabled={adding}>
							{adding ? <Spinner /> : <Plus className="h-4 w-4" aria-hidden />}
							Add territory
						</Button>
					</Form>
				</section>
			</div>
		</>
	);
}
