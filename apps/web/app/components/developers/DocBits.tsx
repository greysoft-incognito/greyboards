import type { ReactNode } from "react";
import { Copy } from "lucide-react";
import { copyText } from "~/lib/toast";
import type { ApiMethod, ApiParam, KeyAbility } from "~/lib/developer-docs";

/** A dark code panel with a label and a copy button. */
export function CodeBlock({ code, label }: { code: string; label?: string }) {
	return (
		<div className="overflow-hidden rounded-[22px] bg-ink-900 shadow-[0_18px_40px_-24px_rgba(30,31,34,0.7)]">
			<div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2">
				<span className="text-xs font-semibold tracking-wide text-surface-300 uppercase">{label ?? "Example"}</span>
				<button
					type="button"
					onClick={() => copyText(code, "Copied.")}
					className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-surface-200 transition hover:bg-white/10 hover:text-white"
				>
					<Copy className="h-3.5 w-3.5" aria-hidden />
					Copy
				</button>
			</div>
			<pre className="max-h-[32rem] overflow-auto px-4 py-4 text-[13px] leading-relaxed text-surface-100">
				<code>{code}</code>
			</pre>
		</div>
	);
}

/** GET or POST, coloured so the eye finds it. */
export function MethodBadge({ method }: { method: ApiMethod }) {
	const tone = method === "GET" ? "bg-emerald-100 text-emerald-800" : "bg-brand-100 text-brand-800";

	return <span className={`inline-flex shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-wide ${tone}`}>{method}</span>;
}

/** Which kind of key a call needs. */
export function AbilityBadge({ ability }: { ability: KeyAbility }) {
	return (
		<span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${ability === "book" ? "bg-amber-100 text-amber-900" : "bg-surface-100 text-ink-700"}`}>
			{ability === "book" ? "Book key" : "Read key"}
		</span>
	);
}

/** A table of path, query or body values. */
export function ParamTable({ title, params }: { title: string; params: ApiParam[] }) {
	return (
		<div>
			<h4 className="text-sm font-semibold text-ink-900">{title}</h4>
			<dl className="mt-2 divide-y divide-surface-100 rounded-2xl bg-surface-100/60 px-4">
				{params.map((param) => (
					<div key={param.name} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-4">
						<dt className="flex flex-wrap items-center gap-2">
							<code className="font-mono text-[13px] font-semibold text-ink-900">{param.name}</code>
							<span className="text-xs text-ink-500">{param.type}</span>
							{param.required && <span className="text-xs font-semibold text-brand-700">required</span>}
						</dt>
						<dd className="text-sm text-ink-700">
							<Inline text={param.description} />
						</dd>
					</div>
				))}
			</dl>
		</div>
	);
}

/** Text with `code` spans. */
export function Inline({ text }: { text: string }) {
	const parts = text.split(/(`[^`]+`)/g);

	return (
		<>
			{parts.map((part, index) =>
				part.startsWith("`") && part.endsWith("`") ? (
					<code key={index} className="rounded-md bg-surface-100 px-1.5 py-0.5 font-mono text-[0.85em] text-ink-900">
						{part.slice(1, -1)}
					</code>
				) : (
					part
				),
			)}
		</>
	);
}

/** The heading block at the top of a developer page. */
export function DocHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
	return (
		<header className="mb-8">
			{eyebrow && <p className="text-sm font-semibold text-brand-700">{eyebrow}</p>}
			<h1 className="mt-1 font-display text-4xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-5xl">{title}</h1>
			{children && <div className="mt-3 max-w-2xl text-lg text-ink-500">{children}</div>}
		</header>
	);
}

/** One titled section of a developer page. */
export function DocSection({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
	return (
		<section id={id} className="scroll-mt-24">
			<h2 className="font-display text-2xl font-bold tracking-tight text-ink-900">{title}</h2>
			<div className="mt-3 space-y-4 text-ink-700">{children}</div>
		</section>
	);
}
