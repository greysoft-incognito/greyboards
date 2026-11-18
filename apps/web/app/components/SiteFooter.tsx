import { Link } from "react-router";
import { Logo } from "~/components/ui";
import { documentPath, useDocuments } from "~/lib/documents";

type FooterLink = { to: string; label: string };

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
	if (!links.length) return null;

	return (
		<nav aria-label={title}>
			<h2 className="text-xs font-bold tracking-[0.14em] text-ink-500 uppercase">{title}</h2>
			<ul className="mt-4 space-y-2.5">
				{links.map((link) => (
					<li key={link.to}>
						<Link prefetch="intent" to={link.to} className="text-sm font-medium text-ink-700 transition hover:text-brand-700">
							{link.label}
						</Link>
					</li>
				))}
			</ul>
		</nav>
	);
}

/** The site's footer under public pages: published pages, policies and the ways in. */
export function SiteFooter() {
	const documents = useDocuments();
	const link = (document: (typeof documents)[number]): FooterLink => ({ to: documentPath(document), label: document.title });
	const company: FooterLink[] = [...documents.filter((document) => document.type === "page").map(link), { to: "/reputation", label: "Reputation" }];
	const legal = documents.filter((document) => document.type === "policy").map(link);
	const explore: FooterLink[] = [
		{ to: "/map", label: "Find a board" },
		{ to: "/signup", label: "List your board" },
		{ to: "/developers", label: "Developers" },
	];

	return (
		<footer className="px-3 pb-3 sm:px-5 sm:pb-5 print:hidden">
			<div className="panel mx-auto max-w-7xl rounded-[1.5rem] px-6 py-10 sm:px-10">
				<div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
					<div className="max-w-xs">
						<Logo />
						<p className="mt-4 text-sm leading-relaxed text-ink-500">Your brand, on billboards anywhere.</p>
					</div>
					<FooterColumn title="Explore" links={explore} />
					<FooterColumn title="Greyboards" links={company} />
					<FooterColumn title="Legal" links={legal} />
				</div>
				<p className="mt-10 border-t border-surface-100 pt-6 text-sm text-ink-500">© {new Date().getFullYear()} Greysoft. All rights reserved.</p>
			</div>
		</footer>
	);
}
