import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useFetcher } from "react-router";
import { ArrowRight, Lightbulb, MapPin, Ruler, SearchX, SlidersHorizontal, X, ZoomIn } from "lucide-react";
import mapStyles from "maplibre-gl/dist/maplibre-gl.css?url";
import { type Board, type BoardKind, type BoardKindDefinition, type BoardPin, currencySymbol } from "@greyboards/types";
import { AppHeader } from "~/components/AppHeader";
import { BoardCover, formatRate, formatSize } from "~/components/boards/BoardBits";
import { BoardMap, type MapMove } from "~/components/map/BoardMap";
import { buttonClass, Input, Select, Spinner } from "~/components/ui";
import { getServerApi } from "~/lib/api.server";
import { cloudflareContext } from "~/lib/cloudflare";
import { type MapFilters, mapSearch, readFilters, readView } from "~/lib/map";
import { useCurrency } from "~/lib/currency";
import { mapStyleUrl } from "~/lib/map.server";
import { optionalUser } from "~/lib/session.server";
import type { loader as dataLoader } from "./data";
import type { Route } from "./+types/index";

export const meta = () => [
	{ title: "Find a board · Greyboards" },
	{ name: "description", content: "Explore billboards on a live map. Filter by type, lighting and price, and book from anywhere." },
];

export const links: Route.LinksFunction = () => [{ rel: "stylesheet", href: mapStyles }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const params = new URL(request.url).searchParams;
	const api = await getServerApi(request, context.get(cloudflareContext).env);
	const [user, kinds] = await Promise.all([
		optionalUser(request, context),
		api
			.boardKinds()
			.then(({ data }) => data)
			.catch((): BoardKindDefinition[] => []),
	]);

	return { user, kinds, styleUrl: mapStyleUrl(context), view: readView(params), filters: readFilters(params) };
}

/** Room the board list takes over the map: beside it on wide screens, below it on phones. */
function panelPadding() {
	if (typeof window === "undefined" || window.innerWidth >= 640) return { left: 420, bottom: 0 };

	return { left: 0, bottom: Math.round(window.innerHeight * 0.44) };
}

/**
 * The map advertisers search: every listed board in view, clustered, with a list of the
 * nearest cards beside it. The view and filters live in the address so a search can be shared.
 */
export default function MapPage({ loaderData }: Route.ComponentProps) {
	const { user, kinds, styleUrl, view } = loaderData;
	const data = useFetcher<typeof dataLoader>();
	const [filters, setFilters] = useState<MapFilters>(loaderData.filters);
	const [move, setMove] = useState<MapMove | null>(null);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [hoveredId, setHoveredId] = useState<string | null>(null);
	const [showFilters, setShowFilters] = useState(false);
	const loaded = useRef(data.data);

	if (data.data) loaded.current = data.data;

	const result = loaded.current;
	const pins = useMemo(() => result?.pins ?? [], [result]);
	const boards = result?.boards ?? [];
	const selected = pins.find((pin) => pin.id === selectedId) ?? null;
	const activeFilters = [filters.kind, filters.lit, filters.maxRateMinor].filter((value) => value !== null).length;

	useEffect(() => {
		if (!move) return;

		const timer = setTimeout(() => {
			const search = mapSearch(move.view, filters);
			const query = new URLSearchParams(search);

			for (const [edge, value] of Object.entries(move.bounds)) query.set(edge, String(value));

			window.history.replaceState(window.history.state, "", `?${search}`);
			data.load(`/map/data?${query}`);
		}, 250);

		return () => clearTimeout(timer);
		// `data` changes on every load; the view and filters decide when to load again.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [move, filters]);

	const onMove = useCallback((next: MapMove) => setMove(next), []);

	return (
		<div className="relative h-dvh overflow-hidden bg-canvas">
			<BoardMap
				styleUrl={styleUrl}
				view={view}
				pins={pins}
				selectedId={selectedId}
				highlightedId={hoveredId}
				onSelect={setSelectedId}
				onMove={onMove}
				padding={panelPadding()}
			/>

			<AppHeader user={user} />

			<aside
				aria-label="Boards in view"
				className="glass absolute inset-x-3 bottom-3 flex max-h-[44dvh] flex-col overflow-hidden rounded-[1.5rem] sm:inset-x-auto sm:top-[calc(var(--header-height,4.5rem)+0.75rem)] sm:bottom-5 sm:left-5 sm:max-h-none sm:w-[380px]"
			>
				<div className="flex items-center justify-between gap-3 border-b border-surface-100 px-4 py-3">
					<div className="min-w-0">
						<h1 className="font-display text-lg font-extrabold tracking-tight text-ink-900">Find a board</h1>
						<p className="flex items-center gap-1.5 text-sm text-ink-500" aria-live="polite">
							{data.state === "loading" && <Spinner className="h-3.5 w-3.5" />}
							{result ? `${result.total.toLocaleString()} ${result.total === 1 ? "board" : "boards"} in view` : "Loading boards…"}
						</p>
					</div>
					<button
						type="button"
						onClick={() => setShowFilters((shown) => !shown)}
						aria-expanded={showFilters}
						className={buttonClass(activeFilters ? "primary" : "secondary", "shrink-0")}
					>
						<SlidersHorizontal className="h-4 w-4" aria-hidden />
						Filters{activeFilters ? ` · ${activeFilters}` : ""}
					</button>
				</div>

				{showFilters && <Filters kinds={kinds} filters={filters} onChange={setFilters} />}

				{result?.truncated && (
					<p className="flex items-center gap-2 bg-amber-50 px-4 py-2 text-sm text-amber-900">
						<ZoomIn className="h-4 w-4 shrink-0" aria-hidden />
						Lots of boards here. Zoom in to see them all.
					</p>
				)}

				<div className="flex-1 overflow-y-auto p-3">
					{boards.length ? (
						<ul className="space-y-2">
							{boards.map((board) => (
								<li key={board.id} onMouseEnter={() => setHoveredId(board.id)} onMouseLeave={() => setHoveredId(null)}>
									<BoardRow board={board} active={board.id === selectedId} onPick={() => setSelectedId(board.id)} />
								</li>
							))}
						</ul>
					) : result ? (
						<div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
							<SearchX className="h-8 w-8 text-ink-500" aria-hidden />
							<p className="font-semibold text-ink-900">No boards here yet</p>
							<p className="text-sm text-ink-500">{activeFilters ? "Try fewer filters, or move the map." : "Move the map or zoom out to look further."}</p>
						</div>
					) : null}
					{result && result.total > boards.length && <p className="px-2 pt-3 text-center text-sm text-ink-500">Zoom in to narrow down the other {(result.total - boards.length).toLocaleString()}.</p>}
				</div>
			</aside>

			{selected && <PickedBoard pin={selected} board={boards.find((board) => board.id === selected.id) ?? null} onClose={() => setSelectedId(null)} />}
		</div>
	);
}

function Filters({ kinds, filters, onChange }: { kinds: BoardKindDefinition[]; filters: MapFilters; onChange: (filters: MapFilters) => void }) {
	const visitor = useCurrency().currency;
	const currency = filters.currency ?? visitor;
	const setMax = (value: string) => {
		const amount = Number(value);
		const maxRateMinor = Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : null;

		if (maxRateMinor !== filters.maxRateMinor) onChange({ ...filters, maxRateMinor, currency: maxRateMinor ? currency : null });
	};

	return (
		<div className="grid grid-cols-2 gap-2 border-b border-surface-100 px-4 py-3">
			<label className="col-span-2 text-sm font-semibold text-ink-700">
				Type
				<Select value={filters.kind ?? ""} onChange={(event) => onChange({ ...filters, kind: (event.target.value as BoardKind) || null })} className="mt-1">
					<option value="">Any type</option>
					{kinds.map((kind) => (
						<option key={kind.kind} value={kind.kind}>
							{kind.label}
						</option>
					))}
				</Select>
			</label>
			<label className="text-sm font-semibold text-ink-700">
				Lighting
				<Select
					value={filters.lit === null ? "" : String(filters.lit)}
					onChange={(event) => onChange({ ...filters, lit: event.target.value === "" ? null : event.target.value === "true" })}
					className="mt-1"
				>
					<option value="">Lighting</option>
					<option value="true">Lit at night</option>
					<option value="false">Not lit</option>
				</Select>
			</label>
			<label className="text-sm font-semibold text-ink-700">
				Max price
				<Input
					key={filters.maxRateMinor ?? "any"}
					type="number"
					min="0"
					step="1000"
					inputMode="numeric"
					placeholder="Any price"
					defaultValue={filters.maxRateMinor ? filters.maxRateMinor / 100 : ""}
					onBlur={(event) => setMax(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") setMax(event.currentTarget.value);
					}}
					addon={currencySymbol(currency)}
					className="mt-1"
				/>
			</label>
			{(filters.kind || filters.lit !== null || filters.maxRateMinor) && (
				<button type="button" onClick={() => onChange({ kind: null, lit: null, maxRateMinor: null, currency: null })} className="col-span-2 justify-self-start text-sm font-semibold text-brand-700 hover:underline">
					Clear filters
				</button>
			)}
		</div>
	);
}

/** A board in the list beside the map. Picking it shows it on the map. */
function BoardRow({ board, active, onPick }: { board: Board; active: boolean; onPick: () => void }) {
	const rate = formatRate(board.rate);

	return (
		<button
			type="button"
			onClick={onPick}
			aria-pressed={active}
			className={`flex w-full gap-3 rounded-2xl p-2 text-left transition ${active ? "bg-brand-50 ring-2 ring-brand-300" : "hover:bg-surface-100"}`}
		>
			<BoardCover board={board} className="w-28 shrink-0 !rounded-xl" />
			<span className="flex min-w-0 flex-col gap-1">
				<span className="truncate font-display font-extrabold tracking-tight text-ink-900">{board.name}</span>
				<span className="flex items-center gap-1 text-xs text-ink-500">
					<MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
					<span className="truncate">{[board.address, board.city].filter(Boolean).join(", ") || board.kindLabel}</span>
				</span>
				<span className="flex items-center gap-1 text-xs text-ink-700">
					<Ruler className="h-3.5 w-3.5 shrink-0 text-ink-500" aria-hidden />
					{board.kindLabel}, {formatSize(board)}
					{board.lit && <Lightbulb className="ml-1 h-3.5 w-3.5 shrink-0 text-ink-500" aria-label="Lit" />}
				</span>
				{rate && <span className="mt-auto text-sm font-extrabold text-ink-900 tabular-nums">{rate}</span>}
			</span>
		</button>
	);
}

/** The board picked on the map, floating over it with a way to open its page. */
function PickedBoard({ pin, board, onClose }: { pin: BoardPin; board: Board | null; onClose: () => void }) {
	const rate = formatRate(pin.rateMinor === null ? null : { amountMinor: pin.rateMinor, currency: pin.currency, period: pin.ratePeriod });

	return (
		<div className="glass absolute top-[calc(var(--header-height,4.5rem)+0.75rem)] right-3 left-3 flex gap-3 rounded-[1.5rem] p-3 sm:top-auto sm:right-5 sm:bottom-5 sm:left-auto sm:w-[360px]">
			{board && <BoardCover board={board} className="w-24 shrink-0 !rounded-xl" />}
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<p className="truncate font-display font-extrabold tracking-tight text-ink-900">{pin.name}</p>
				<p className="text-xs text-ink-500">{board ? `${board.kindLabel}, ${formatSize(board)}` : pin.lit ? "Lit at night" : "Board"}</p>
				{rate && <p className="text-sm font-extrabold text-ink-900 tabular-nums">{rate}</p>}
				<Link prefetch="intent" to={`/boards/${pin.id}`} className={buttonClass("primary", "mt-1 self-start !min-h-9 !py-1.5")}>
					See the board
					<ArrowRight className="h-4 w-4" aria-hidden />
				</Link>
			</div>
			<button type="button" onClick={onClose} aria-label="Close" className="self-start rounded-full p-1 text-ink-500 hover:bg-surface-100 hover:text-ink-900">
				<X className="h-4 w-4" aria-hidden />
			</button>
		</div>
	);
}
