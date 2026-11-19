import { Link } from "react-router";
import { ArrowRight, BookOpen, CalendarCheck, CreditCard, Gauge, KeyRound, Search } from "lucide-react";
import { buttonClass } from "~/components/ui";
import { CodeBlock, DocSection } from "~/components/developers/DocBits";
import { useApiBase } from "~/components/developers/useApiBase";
import { API_ENDPOINTS } from "~/lib/developer-docs";

export const meta = () => [
	{ title: "Developers · Greyboards" },
	{ name: "description", content: "Search boards, check free dates, hold dates and pay from your own tools with the Greyboards API." },
];

const STEPS = [
	{ icon: KeyRound, title: "Make a key", text: "In Settings, under API keys. Pick read, or read and book." },
	{ icon: Search, title: "Find boards", text: "Search near a point or inside a map box, then check taken days." },
	{ icon: CalendarCheck, title: "Hold dates", text: "Hold a run on a face for a few minutes while you pay." },
	{ icon: CreditCard, title: "Pay", text: "Start payment and send the payer to the checkout link." },
];

export default function DevelopersHome() {
	const base = useApiBase();
	const example = `curl "${base}/boards?lat=10.5222&lng=7.4383&radiusKm=5" \\
  -H "Authorization: Bearer $GREYBOARDS_KEY" \\
  -H "Accept: application/json"`;

	return (
		<div className="space-y-12">
			<section className="bg-brand-sweep relative overflow-hidden rounded-[28px] px-6 py-10 text-white shadow-[0_30px_60px_-30px_rgba(131,59,75,0.8)] sm:px-10 sm:py-14">
				<p className="text-sm font-semibold text-brand-100">Greyboards API</p>
				<h1 className="mt-2 max-w-2xl font-display text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">Book boards from your own tools</h1>
				<p className="mt-4 max-w-xl text-lg text-white/80">
					Media planners and agencies can search listed boards, see what's free, hold dates and pay, all over plain HTTPS with JSON.
				</p>
				<div className="mt-8 flex flex-wrap gap-3">
					<Link prefetch="intent" to="/settings/api-keys" className={buttonClass("secondary")}>
						<KeyRound className="h-4 w-4" aria-hidden />
						Get a key
					</Link>
					<Link prefetch="intent" to="/developers/reference" className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/10">
						<BookOpen className="h-4 w-4" aria-hidden />
						Read the endpoints
					</Link>
				</div>
			</section>

			<DocSection title="How it works">
				<ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{STEPS.map((step, index) => (
						<li key={step.title} className="panel p-5">
							<span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
								<step.icon className="h-5 w-5" aria-hidden />
							</span>
							<p className="mt-4 text-xs font-semibold text-ink-500">Step {index + 1}</p>
							<p className="font-display text-lg font-bold text-ink-900">{step.title}</p>
							<p className="mt-1 text-sm text-ink-500">{step.text}</p>
						</li>
					))}
				</ol>
			</DocSection>

			<DocSection title="Your first call">
				<p>
					Every call goes to <code className="rounded-md bg-surface-100 px-1.5 py-0.5 font-mono text-sm text-ink-900">{base}</code> with your key as a bearer token. This one finds boards within 5 km of a point, nearest
					first.
				</p>
				<CodeBlock label="Request" code={example} />
				<p className="text-sm text-ink-500">Amounts are whole numbers in the minor unit of their currency, such as kobo or cents, so ₦500,000 is 50000000. Each amount comes with its currency. Dates are YYYY-MM-DD.</p>
			</DocSection>

			<DocSection title="What you can call">
				<div className="grid gap-3 sm:grid-cols-2">
					{API_ENDPOINTS.map((endpoint) => (
						<Link key={endpoint.id} prefetch="intent" to={`/developers/reference#${endpoint.id}`} className="panel lift group flex items-start justify-between gap-3 p-4">
							<span>
								<span className="block font-semibold text-ink-900">{endpoint.title}</span>
								<span className="mt-0.5 block font-mono text-xs text-ink-500">
									{endpoint.method} {endpoint.path}
								</span>
							</span>
							<ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ink-500 transition group-hover:translate-x-0.5 group-hover:text-brand-700" aria-hidden />
						</Link>
					))}
				</div>
			</DocSection>

			<div className="panel flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-start gap-3">
					<Gauge className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden />
					<p className="text-sm text-ink-700">Each key has a limit on calls a minute, and each account a limit on keys. Going over answers 429.</p>
				</div>
				<Link prefetch="intent" to="/developers/errors" className={buttonClass("secondary", "shrink-0")}>
					Errors and limits
				</Link>
			</div>
		</div>
	);
}
