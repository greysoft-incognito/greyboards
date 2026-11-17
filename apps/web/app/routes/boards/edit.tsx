import { Link, redirect } from "react-router";
import { ArrowLeft } from "lucide-react";
import { BoardForm } from "~/components/boards/BoardForm";
import { formError } from "~/lib/api.server";
import { boardInput } from "~/lib/boards.server";
import { requireUser } from "~/lib/session.server";
import type { Route } from "./+types/edit";

export const meta = () => [{ title: "Edit board · Greyboards" }];

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const { api, user } = await requireUser(request, context);
	const [{ data: board }, { data: kinds }] = await Promise.all([api.board(params.id), api.boardKinds()]);

	if (board.owner?.userId !== user.id && board.taggedById !== user.id) throw new Response("Not found", { status: 404 });

	return { board, kinds };
}

export async function action({ request, context, params }: Route.ActionArgs) {
	const { api } = await requireUser(request, context);

	try {
		await api.account.updateBoard(params.id, boardInput(await request.formData()));
	} catch (error) {
		return formError(error);
	}

	throw redirect(`/boards/${params.id}?saved=1`);
}

/** Change a board's details. Moving or resizing a listed board sends it back for review. */
export default function EditBoard({ loaderData, actionData }: Route.ComponentProps) {
	const { board, kinds } = loaderData;

	return (
		<main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
			<Link prefetch="intent" to={`/boards/${board.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
				<ArrowLeft className="h-4 w-4" aria-hidden />
				{board.name}
			</Link>
			<h1 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-4xl">Edit board</h1>
			<p className="mt-1 mb-6 text-ink-500">{board.status === "listed" ? "Moving or resizing it takes it off the map until we check it again." : "Changes go to review with the board."}</p>
			<BoardForm kinds={kinds} board={board} error={actionData?.error} fieldErrors={actionData?.fieldErrors} />
		</main>
	);
}
