import { Link, useSearchParams } from "react-router";
import type { PaginationMeta } from "@greyboards/types";
import { buttonClass } from "~/components/ui";

/** Previous and next links for a paginated list, keeping the other filters in the address. */
export function Pager({ meta, noun }: { meta: PaginationMeta; noun: string }) {
	const [params] = useSearchParams();
	const pageLink = (page: number) => {
		const next = new URLSearchParams(params);

		next.set("page", String(page));

		return `?${next}`;
	};

	if (meta.last_page <= 1) return null;

	return (
		<nav className="flex items-center justify-between text-sm text-ink-500" aria-label="Pages">
			<span>
				Page {meta.current_page} of {meta.last_page} · {meta.total} {noun}
			</span>
			<div className="flex gap-2">
				{meta.current_page > 1 && (
					<Link to={pageLink(meta.current_page - 1)} className={buttonClass("secondary")}>
						Previous
					</Link>
				)}
				{meta.current_page < meta.last_page && (
					<Link to={pageLink(meta.current_page + 1)} className={buttonClass("secondary")}>
						Next
					</Link>
				)}
			</div>
		</nav>
	);
}
