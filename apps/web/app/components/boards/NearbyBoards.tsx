import { useEffect, useRef } from "react";
import { Link, useFetcher } from "react-router";
import { TriangleAlert } from "lucide-react";
import type { NearbyBoard } from "@greyboards/types";

/** Warns when boards are already tagged where the pin is, so a scout doesn't tag one twice. */
export function NearbyBoards({ latitude, longitude }: { latitude: string; longitude: string }) {
	const fetcher = useFetcher<{ boards: NearbyBoard[] }>();
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const boards = fetcher.data?.boards ?? [];

	useEffect(() => {
		clearTimeout(timer.current);

		const lat = Number(latitude);
		const lng = Number(longitude);

		if (!latitude || !longitude || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

		timer.current = setTimeout(() => fetcher.load(`/boards/nearby?lat=${lat}&lng=${lng}`), 400);

		return () => clearTimeout(timer.current);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [latitude, longitude]);

	if (!boards.length) return null;

	return (
		<div className="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-ink-700" role="status">
			<TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-held" aria-hidden />
			<div>
				<p className="font-semibold text-ink-900">{boards.length === 1 ? "A board is already tagged here" : `${boards.length} boards are already tagged here`}</p>
				<p className="mt-0.5">Check it isn't this one. If you tag it anyway, our reviewers will compare the two.</p>
				<ul className="mt-2 space-y-1">
					{boards.map((board) => (
						<li key={board.id}>
							<Link prefetch="intent" to={`/boards/${board.id}`} className="font-medium text-brand-700 hover:underline">
								{board.name}
							</Link>
							<span className="text-ink-500"> · {board.distanceM} m away</span>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}
