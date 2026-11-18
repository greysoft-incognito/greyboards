import { Link, redirect } from "react-router";
import { ArrowLeft } from "lucide-react";
import { BoardForm } from "~/components/boards/BoardForm";
import { formError } from "~/lib/api.server";
import { boardInput, boardOwner, photoLocation, postedPhoto } from "~/lib/boards.server";
import { requireUser } from "~/lib/session.server";
import type { Route } from "./+types/new";

export const meta = () => [{ title: "Tag a board · Greyboards" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api, user } = await requireUser(request, context);
	const tagAs = (["owner", "scout"] as const).filter((kind) => user.accountRoles.some((role) => role.kind === kind && role.status === "active"));

	if (!tagAs.length) throw redirect("/settings/roles");

	const [{ data: kinds }, profiles, owner, scout] = await Promise.all([
		api.boardKinds(),
		tagAs.includes("owner") ? api.account.ownerProfiles({ per_page: 100 }) : null,
		api.account.ownerPrice({ as: "owner" }),
		api.account.ownerPrice({ as: "scout" }),
	]);

	return { kinds, tagAs, ownerProfiles: profiles?.data ?? [], ownerPercents: { owner: owner.data.ownerPercent, scout: scout.data.ownerPercent } };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireUser(request, context);
	const form = await request.formData();
	const as = form.get("as") === "scout" ? "scout" : "owner";
	let id: string;

	try {
		id = (await api.account.tagBoard({ ...boardInput(form), ...boardOwner(form), as })).data.id;
	} catch (error) {
		return formError(error);
	}

	const photo = postedPhoto(form);

	if (photo) {
		try {
			await api.account.addBoardPhoto(id, photo, photoLocation(form));
		} catch {
			throw redirect(`/boards/${id}?photo=failed`);
		}
	}

	throw redirect(`/boards/${id}?tagged=1`);
}

/** Tag a board while standing by it: its place, size, rate and a first photo. */
export default function NewBoard({ loaderData, actionData }: Route.ComponentProps) {
	return (
		<main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
			<Link prefetch="intent" to="/boards" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
				<ArrowLeft className="h-4 w-4" aria-hidden />
				My boards
			</Link>
			<h1 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-4xl">Tag a board</h1>
			<p className="mt-1 mb-6 text-ink-500">We review every board before it goes live, usually within a day.</p>
			<BoardForm kinds={loaderData.kinds} tagAs={loaderData.tagAs} ownerProfiles={loaderData.ownerProfiles} ownerPercents={loaderData.ownerPercents} error={actionData?.error} fieldErrors={actionData?.fieldErrors} />
		</main>
	);
}
