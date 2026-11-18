import { NavLink, Outlet } from "react-router";
import { CodeXml } from "lucide-react";
import { cloudflareContext } from "~/lib/cloudflare";
import { API_ENDPOINTS, API_GROUPS, DEVELOPER_PAGES } from "~/lib/developer-docs";
import { MethodBadge } from "~/components/developers/DocBits";
import type { Route } from "./+types/layout";

/** Where the public API answers, for the examples. */
export function loader({ context }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);

	return { apiBase: `${String(env.API_URL).replace(/\/$/, "")}/v1` };
}

export default function DevelopersLayout() {
	const link = ({ isActive }: { isActive: boolean }) =>
		`block rounded-xl px-3 py-2 text-sm font-semibold transition ${isActive ? "bg-white text-ink-900 shadow-[0_6px_18px_-10px_rgba(30,31,34,0.35)]" : "text-ink-700 hover:bg-white/60 hover:text-ink-900"}`;

	return (
		<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
			<div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
				<aside className="mb-8 lg:mb-0">
					<div className="lg:sticky lg:top-24">
						<p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-500">
							<CodeXml className="h-4 w-4" aria-hidden />
							Developers
						</p>
						<nav aria-label="Developer docs" className="-mx-1 flex gap-1 overflow-x-auto pb-1 lg:mx-0 lg:block lg:space-y-1 lg:overflow-visible">
							{DEVELOPER_PAGES.map((page) => (
								<NavLink key={page.to} to={page.to} end={"end" in page} prefetch="intent" className={(state) => `${link(state)} shrink-0`}>
									{page.label}
								</NavLink>
							))}
						</nav>
						<div className="mt-6 hidden space-y-4 lg:block">
							{API_GROUPS.map((group) => (
								<div key={group}>
									<p className="px-3 text-xs font-semibold tracking-wide text-ink-500 uppercase">{group}</p>
									<ul className="mt-1 space-y-0.5">
										{API_ENDPOINTS.filter((endpoint) => endpoint.group === group).map((endpoint) => (
											<li key={endpoint.id}>
												<a href={`/developers/reference#${endpoint.id}`} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-ink-700 hover:bg-white/60 hover:text-ink-900">
													<MethodBadge method={endpoint.method} />
													<span className="truncate">{endpoint.title}</span>
												</a>
											</li>
										))}
									</ul>
								</div>
							))}
						</div>
					</div>
				</aside>
				<main className="min-w-0">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
