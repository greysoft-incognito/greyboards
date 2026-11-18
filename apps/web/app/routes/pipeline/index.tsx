import { useState } from "react";
import { Form, Link, NavLink, useNavigation } from "react-router";
import { Crosshair, MapPinned, Plus, Trash2 } from "lucide-react";
import type { Prospect, ProspectInput, ProspectStage } from "@greyboards/types";
import { MANUAL_STAGES, STAGES, StageBadge, TaskList } from "~/components/scouting/ScoutingBits";
import { Pager } from "~/components/Pager";
import { Alert, Button, Field, Input, Select, Spinner, Textarea } from "~/components/ui";
import { formError } from "~/lib/api.server";
import { requireUser } from "~/lib/session.server";
import { useToastMessage } from "~/lib/toast";
import type { Route } from "./+types/index";

export const meta = () => [{ title: "Pipeline · Greyboards" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api, user } = await requireUser(request, context);

	if (!user.accountRoles.some((role) => role.kind === "scout" && role.status === "active")) throw new Response("Not found", { status: 404 });

	const params = new URL(request.url).searchParams;
	const stage = STAGES.find((entry) => entry.value === params.get("stage"))?.value;
	const [prospects, territories, tasks] = await Promise.all([api.prospects.list({ stage, page: Number(params.get("page")) || 1 }), api.territories(), api.tasks()]);

	return { prospects: prospects.data, counts: prospects.counts, meta: prospects.meta, stage: stage ?? null, territories: territories.data, tasks: tasks.data };
}

/** The fields of the add and edit forms. */
function details(form: FormData): ProspectInput {
	const text = (key: string) => String(form.get(key) ?? "").trim() || null;

	return { name: String(form.get("name") ?? ""), address: text("address"), ownerName: text("ownerName"), ownerPhone: text("ownerPhone"), notes: text("notes") };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireUser(request, context);
	const form = await request.formData();
	const intent = String(form.get("intent"));
	const id = String(form.get("id") ?? "");

	try {
		if (intent === "add") {
			await api.prospects.create({ ...details(form), name: String(form.get("name") ?? ""), latitude: Number(form.get("latitude")), longitude: Number(form.get("longitude")) });

			return { error: null, message: "Added." };
		}

		if (intent === "stage") {
			await api.prospects.update(id, { stage: String(form.get("stage")) as ProspectInput["stage"] });

			return { error: null, message: null };
		}

		if (intent === "edit") {
			await api.prospects.update(id, details(form));

			return { error: null, message: "Saved." };
		}

		if (intent === "remove") {
			await api.prospects.remove(id);

			return { error: null, message: "Removed." };
		}

		return { error: "Unknown action.", message: null };
	} catch (error) {
		return { error: formError(error).error, message: null };
	}
}

/** The scout's pipeline: boards spotted, owners talked to, boards captured and earning, with what needs doing. */
export default function Pipeline({ loaderData, actionData }: Route.ComponentProps) {
	useToastMessage(actionData);

	const { prospects, counts, meta, stage, territories, tasks } = loaderData;
	const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
	const tab = (active: boolean) => `shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition ${active ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-surface-100"}`;

	return (
		<main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
			<div>
				<h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-4xl">Pipeline</h1>
				<p className="mt-1 text-ink-500">Keep track of boards you've spotted, from first sighting to first booking.</p>
			</div>

			<nav aria-label="Stages" className="glass flex max-w-full gap-1 overflow-x-auto rounded-2xl p-1">
				<NavLink to="/pipeline" end className={() => tab(!stage)}>
					All <span className="tabular-nums opacity-70">{total}</span>
				</NavLink>
				{STAGES.map((entry) => (
					<NavLink key={entry.value} to={`/pipeline?stage=${entry.value}`} className={() => tab(stage === entry.value)}>
						{entry.label} <span className="tabular-nums opacity-70">{counts[entry.value] ?? 0}</span>
					</NavLink>
				))}
			</nav>
			{actionData?.error && <Alert>{actionData.error}</Alert>}

			<div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
				<section className="space-y-3">
					{prospects.length ? prospects.map((prospect) => <ProspectCard key={prospect.id} prospect={prospect} />) : <p className="panel px-5 py-10 text-center text-sm text-ink-500">{stage ? "Nothing at this stage." : "Add the first board you spot."}</p>}
					<Pager meta={meta} noun="prospects" />
				</section>

				<aside className="space-y-4">
					<AddProspect />
					<section className="panel space-y-2 p-5">
						<h2 className="font-display text-lg font-extrabold tracking-tight text-ink-900">To do</h2>
						<TaskList tasks={tasks} limit={8} />
					</section>
					{territories.length > 0 && (
						<section className="panel space-y-2 p-5">
							<h2 className="font-display text-lg font-extrabold tracking-tight text-ink-900">Your territories</h2>
							<ul className="space-y-1 text-sm text-ink-700">
								{territories.map((territory) => (
									<li key={territory.id} className="flex items-center gap-2">
										<MapPinned className="h-4 w-4 text-brand-700" aria-hidden />
										{territory.name} · {(territory.radiusM / 1000).toFixed(1)} km around {territory.latitude.toFixed(4)}, {territory.longitude.toFixed(4)}
									</li>
								))}
							</ul>
						</section>
					)}
				</aside>
			</div>
		</main>
	);
}

function ProspectCard({ prospect }: { prospect: Prospect }) {
	const navigation = useNavigation();
	const busy = navigation.formData?.get("id") === prospect.id;
	const manual = MANUAL_STAGES.includes(prospect.stage);

	return (
		<article id={`prospect-${prospect.id}`} className="panel space-y-3 p-4 sm:p-5">
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div className="min-w-0">
					<h2 className="font-semibold text-ink-900">{prospect.name}</h2>
					<p className="text-sm text-ink-500">
						{prospect.address ?? `${prospect.latitude.toFixed(5)}, ${prospect.longitude.toFixed(5)}`}
						{prospect.ownerName && <> · {prospect.ownerName}</>}
						{prospect.ownerPhone && <span className="tabular-nums"> · {prospect.ownerPhone}</span>}
					</p>
				</div>
				<StageBadge stage={prospect.stage} />
			</div>
			{prospect.notes && <p className="text-sm whitespace-pre-line text-ink-700">{prospect.notes}</p>}
			<div className="flex flex-wrap items-center gap-2">
				{manual && !prospect.boardId ? (
					<Form method="post" preventScrollReset className="flex items-center gap-2">
						<input type="hidden" name="intent" value="stage" />
						<input type="hidden" name="id" value={prospect.id} />
						<Select name="stage" defaultValue={prospect.stage} aria-label="Stage" className="!min-h-9 w-auto !py-1.5" onChange={(event) => event.currentTarget.form?.requestSubmit()}>
							{STAGES.filter((entry) => MANUAL_STAGES.includes(entry.value)).map((entry) => (
								<option key={entry.value} value={entry.value}>
									{entry.label}
								</option>
							))}
						</Select>
						{busy && <Spinner />}
					</Form>
				) : prospect.boardId ? (
					<Link prefetch="intent" to={`/boards/${prospect.boardId}`} className="text-sm font-semibold text-brand-700 hover:underline">
						See the board
					</Link>
				) : null}
				{!prospect.boardId && prospect.stage === "signed" && (
					<Link prefetch="intent" to="/boards/new" className="text-sm font-semibold text-brand-700 hover:underline">
						Tag the board
					</Link>
				)}
				<details className="group ml-auto">
					<summary className="cursor-pointer list-none rounded-lg px-2 py-1 text-sm font-semibold text-ink-700 hover:bg-surface-100">Edit</summary>
					<Form method="post" preventScrollReset className="mt-3 w-full space-y-3 sm:w-96">
						<input type="hidden" name="id" value={prospect.id} />
						<ProspectFields prospect={prospect} />
						<div className="flex flex-wrap gap-2">
							<Button type="submit" name="intent" value="edit" disabled={busy}>
								Save
							</Button>
							<Button type="submit" name="intent" value="remove" variant="ghost" className="text-red-700" disabled={busy}>
								<Trash2 className="h-4 w-4" aria-hidden />
								Remove
							</Button>
						</div>
					</Form>
				</details>
			</div>
		</article>
	);
}

function ProspectFields({ prospect }: { prospect?: Prospect }) {
	return (
		<>
			<Field label="What and where">
				<Input name="name" required minLength={2} maxLength={120} defaultValue={prospect?.name} placeholder="Such as: Unipole at Wuse roundabout" />
			</Field>
			<Field label="Address">
				<Input name="address" maxLength={191} defaultValue={prospect?.address ?? ""} />
			</Field>
			<div className="grid grid-cols-2 gap-3">
				<Field label="Owner">
					<Input name="ownerName" maxLength={120} defaultValue={prospect?.ownerName ?? ""} />
				</Field>
				<Field label="Owner’s phone">
					<Input name="ownerPhone" type="tel" maxLength={20} defaultValue={prospect?.ownerPhone ?? ""} />
				</Field>
			</div>
			<Field label="Notes">
				<Textarea name="notes" rows={2} maxLength={2000} defaultValue={prospect?.notes ?? ""} />
			</Field>
		</>
	);
}

function AddProspect() {
	const navigation = useNavigation();
	const busy = navigation.formData?.get("intent") === "add";
	const [point, setPoint] = useState({ latitude: "", longitude: "" });
	const [locating, setLocating] = useState(false);
	const [problem, setProblem] = useState<string | null>(null);

	const locate = () => {
		if (!navigator.geolocation) return setProblem("Your browser can't share your location. Enter the coordinates instead.");

		setLocating(true);
		setProblem(null);
		navigator.geolocation.getCurrentPosition(
			(position) => {
				setPoint({ latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6) });
				setLocating(false);
			},
			() => {
				setProblem("We couldn't find your location. Allow access, or enter the coordinates.");
				setLocating(false);
			},
			{ enableHighAccuracy: true, timeout: 15_000 },
		);
	};

	return (
		<section className="panel space-y-3 p-5">
			<h2 className="font-display text-lg font-extrabold tracking-tight text-ink-900">Add a board</h2>
			<Form method="post" className="space-y-3">
				<input type="hidden" name="intent" value="add" />
				<ProspectFields />
				<div className="grid grid-cols-2 gap-3">
					<Field label="Latitude">
						<Input name="latitude" type="number" step="any" min="-90" max="90" required value={point.latitude} onChange={(event) => setPoint((current) => ({ ...current, latitude: event.target.value }))} />
					</Field>
					<Field label="Longitude">
						<Input name="longitude" type="number" step="any" min="-180" max="180" required value={point.longitude} onChange={(event) => setPoint((current) => ({ ...current, longitude: event.target.value }))} />
					</Field>
				</div>
				<Button type="button" variant="secondary" onClick={locate} disabled={locating} className="w-full">
					{locating ? <Spinner /> : <Crosshair className="h-4 w-4" aria-hidden />}
					Use my location
				</Button>
				{problem && <p className="text-sm text-red-700">{problem}</p>}
				<Button type="submit" disabled={busy} className="w-full">
					{busy ? <Spinner /> : <Plus className="h-4 w-4" aria-hidden />}
					Add to pipeline
				</Button>
			</Form>
		</section>
	);
}
