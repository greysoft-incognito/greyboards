import { Form, Link, useSearchParams } from "react-router";
import { FileSpreadsheet, Plus, Tags } from "lucide-react";
import type { BoardStatus } from "@greyboards/types";
import { BoardCard } from "~/components/boards/BoardBits";
import { BoardScene } from "~/components/BoardScene";
import { Pager } from "~/components/Pager";
import { buttonClass, Select } from "~/components/ui";
import { requireUser } from "~/lib/session.server";
import type { Route } from "./+types/index";

export const meta = () => [{ title: "My boards · Greyboards" }];

const STATUSES: { value: BoardStatus; label: string }[] = [
	{ value: "listed", label: "On the map" },
	{ value: "pending", label: "Waiting for review" },
	{ value: "rejected", label: "Not approved" },
	{ value: "unlisted", label: "Off the map" },
];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api, user } = await requireUser(request, context);
	const params = new URL(request.url).searchParams;
	const status = STATUSES.find((entry) => entry.value === params.get("status"))?.value;
	const result = await api.account.boards({ status, page: Number(params.get("page")) || 1 });
	const canTag = user.accountRoles.some((role) => (role.kind === "owner" || role.kind === "scout") && role.status === "active");
	const canImport = user.accountRoles.some((role) => role.kind === "owner" && role.status === "active");

	return { boards: result.data, meta: result.meta, canTag, canImport };
}

/** The boards the account owns or tagged, newest first. */
export default function Boards({ loaderData }: Route.ComponentProps) {
	const { boards, meta, canTag, canImport } = loaderData;
	const [params] = useSearchParams();

	return (
		<main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-4xl">My boards</h1>
					<p className="mt-1 text-ink-500">Boards you own or have added.</p>
					{params.get("imported") && (
						<p className="mt-2 text-sm font-semibold text-available" role="status">
							{params.get("imported")} boards imported. We'll check them before they go on the map.
						</p>
					)}
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Form method="get" onChange={(event) => event.currentTarget.requestSubmit()}>
						<Select name="status" defaultValue={params.get("status") ?? ""} aria-label="Status" className="w-auto">
							<option value="">Every board</option>
							{STATUSES.map((entry) => (
								<option key={entry.value} value={entry.value}>
									{entry.label}
								</option>
							))}
						</Select>
					</Form>
					{canImport && (
						<Link prefetch="intent" to="/boards/import" className={buttonClass("secondary")}>
							<FileSpreadsheet className="h-4 w-4" aria-hidden />
							Import
						</Link>
					)}
					{canTag && boards.length > 1 && (
						<Link prefetch="intent" to="/boards/prices" className={buttonClass("secondary")}>
							<Tags className="h-4 w-4" aria-hidden />
							Change rates
						</Link>
					)}
					{canTag && (
						<Link prefetch="intent" to="/boards/new" className={buttonClass("primary")}>
							<Plus className="h-4 w-4" aria-hidden />
							Tag a board
						</Link>
					)}
				</div>
			</div>

			{boards.length ? (
				<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{boards.map((board) => (
						<BoardCard key={board.id} board={board} to={`/boards/${board.id}`} />
					))}
				</div>
			) : (
				<section className="panel mt-6 flex flex-col items-center gap-5 px-6 py-10 text-center">
					<div className="aspect-[400/260] w-64 overflow-hidden rounded-2xl">
						<BoardScene time="dusk" art="empty" headline="Your board here" />
					</div>
					<div>
						<h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900">{params.get("status") ? "No boards like that yet" : "No boards yet"}</h2>
						<p className="mt-1 max-w-md text-sm text-ink-500">
							{canTag ? "Stand next to a board and tap Tag a board. We'll use your location to place it." : "Become an owner or scout to start adding boards."}
						</p>
					</div>
					<Link prefetch="intent" to={canTag ? "/boards/new" : "/settings/roles"} className={buttonClass("primary")}>
						{canTag ? <Plus className="h-4 w-4" aria-hidden /> : null}
						{canTag ? "Tag a board" : "Choose roles"}
					</Link>
				</section>
			)}

			<div className="mt-6">
				<Pager meta={meta} noun="boards" />
			</div>
		</main>
	);
}
