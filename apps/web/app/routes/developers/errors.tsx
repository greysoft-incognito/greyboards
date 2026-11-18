import { ERROR_CODES, json } from "~/lib/developer-docs";
import { CodeBlock, DocHeader, DocSection, Inline } from "~/components/developers/DocBits";

export const meta = () => [{ title: "Errors and limits · Developers · Greyboards" }];

export default function DevelopersErrors() {
	return (
		<div className="space-y-10">
			<DocHeader eyebrow="Developers" title="Errors and limits">
				Every answer is JSON in the same shape, so you can check one field to know if a call worked.
			</DocHeader>

			<DocSection title="What comes back">
				<p>
					A call that works answers <code className="font-mono text-sm">status: "success"</code> with the result in <code className="font-mono text-sm">data</code>. Lists come a page at a time, with{" "}
					<code className="font-mono text-sm">meta</code> saying where you are.
				</p>
				<div className="grid items-start gap-4 xl:grid-cols-2">
					<CodeBlock label="One thing" code={json({ data: { id: "995ee6a7-…", name: "Ahmadu Bello Way, by the stadium" }, status: "success", message: "OK", code: 200 })} />
					<CodeBlock label="A page of things" code={json({ data: ["…"], meta: { current_page: 1, per_page: 20, total: 57, last_page: 3 }, status: "success", message: "OK", code: 200 })} />
				</div>
				<p>
					A call that fails answers <code className="font-mono text-sm">status: "error"</code> with a <code className="font-mono text-sm">message</code> you can show a person. When the body didn't pass checks,{" "}
					<code className="font-mono text-sm">errors</code> lists what's wrong with each field.
				</p>
				<CodeBlock label="422" code={json({ status: "error", code: 422, message: "The starts on field is required.", errors: { startsOn: ["The starts on field is required."] } })} />
			</DocSection>

			<DocSection title="Status codes">
				<div className="panel divide-y divide-surface-100 px-5">
					{ERROR_CODES.map((error) => (
						<div key={error.code} className="grid gap-1 py-4 sm:grid-cols-[8rem_1fr] sm:gap-4">
							<p>
								<span className="font-mono text-sm font-bold text-ink-900">{error.code}</span>
								<span className="ml-2 text-sm text-ink-500">{error.title}</span>
							</p>
							<p className="text-sm text-ink-700">
								<Inline text={error.meaning} />
							</p>
						</div>
					))}
				</div>
			</DocSection>

			<DocSection title="Limits">
				<ul className="list-disc space-y-2 pl-5">
					<li>Each key can make a set number of calls a minute. Past that, calls answer 429 until the minute is up, so wait and try again rather than retrying at once.</li>
					<li>Each account can hold a set number of live keys. Remove one you no longer use to make another.</li>
					<li>Held dates are let go after a few minutes if nobody pays. Start payment soon after holding.</li>
					<li>Pages hold up to 100 boards or 50 bookings.</li>
				</ul>
				<p className="text-sm text-ink-500">Greyboards sets these limits and may change them. If you need more, get in touch.</p>
			</DocSection>
		</div>
	);
}
