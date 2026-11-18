import { API_ENDPOINTS, API_GROUPS, curlFor, json, type ApiEndpoint } from "~/lib/developer-docs";
import { AbilityBadge, CodeBlock, DocHeader, Inline, MethodBadge, ParamTable } from "~/components/developers/DocBits";
import { useApiBase } from "~/components/developers/useApiBase";

export const meta = () => [{ title: "Endpoints · Developers · Greyboards" }];

export default function DevelopersReference() {
	const base = useApiBase();

	return (
		<div>
			<DocHeader eyebrow="Developers" title="Endpoints">
				Every path below starts with <code className="rounded-md bg-surface-100 px-1.5 py-0.5 font-mono text-base text-ink-900">{base}</code>. Examples are shortened; real answers can carry more fields.
			</DocHeader>
			<div className="space-y-14">
				{API_GROUPS.map((group) => (
					<section key={group} aria-labelledby={`group-${group}`}>
						<h2 id={`group-${group}`} className="font-display text-sm font-bold tracking-wide text-ink-500 uppercase">
							{group}
						</h2>
						<div className="mt-4 space-y-8">
							{API_ENDPOINTS.filter((endpoint) => endpoint.group === group).map((endpoint) => (
								<Endpoint key={endpoint.id} endpoint={endpoint} base={base} />
							))}
						</div>
					</section>
				))}
			</div>
		</div>
	);
}

function Endpoint({ endpoint, base }: { endpoint: ApiEndpoint; base: string }) {
	return (
		<article id={endpoint.id} className="panel scroll-mt-24 p-5 sm:p-7">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h3 className="font-display text-2xl font-bold tracking-tight text-ink-900">{endpoint.title}</h3>
				<AbilityBadge ability={endpoint.ability} />
			</div>
			<p className="mt-3 flex items-center gap-2 overflow-x-auto rounded-xl bg-surface-100 px-3 py-2 font-mono text-sm text-ink-900">
				<MethodBadge method={endpoint.method} />
				<span className="whitespace-nowrap">{endpoint.path}</span>
			</p>
			<p className="mt-4 text-ink-700">
				<Inline text={endpoint.summary} />
			</p>
			<div className="mt-6 space-y-5">
				{endpoint.pathParams && <ParamTable title="Path" params={endpoint.pathParams} />}
				{endpoint.query && <ParamTable title="Query" params={endpoint.query} />}
				{endpoint.body && <ParamTable title="Body (JSON)" params={endpoint.body} />}
				{endpoint.notes && (
					<ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-700">
						{endpoint.notes.map((note) => (
							<li key={note}>
								<Inline text={note} />
							</li>
						))}
					</ul>
				)}
				<div className="grid items-start gap-4 xl:grid-cols-2">
					<CodeBlock label="Request" code={curlFor(endpoint, base)} />
					<CodeBlock label="Response" code={json(endpoint.exampleResponse)} />
				</div>
			</div>
		</article>
	);
}
