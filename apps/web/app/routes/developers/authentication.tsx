import { Link } from "react-router";
import { ShieldCheck } from "lucide-react";
import { buttonClass } from "~/components/ui";
import { AbilityBadge, CodeBlock, DocHeader, DocSection } from "~/components/developers/DocBits";
import { useApiBase } from "~/components/developers/useApiBase";

export const meta = () => [{ title: "Keys and sign-in · Developers · Greyboards" }];

export default function DevelopersAuthentication() {
	const base = useApiBase();

	return (
		<div className="space-y-10">
			<DocHeader eyebrow="Developers" title="Keys and sign-in">
				Every call carries an API key. A key acts as the account that made it, so anything it books is that account's booking.
			</DocHeader>

			<DocSection title="Make a key">
				<ol className="list-decimal space-y-2 pl-5">
					<li>Sign in and open Settings, then API keys.</li>
					<li>Name the key after the tool that will use it, such as "Media planning sheet".</li>
					<li>Choose what it can do, then copy the key. It starts with <code className="font-mono text-sm">gbk_</code> and shows only once.</li>
				</ol>
				<Link prefetch="intent" to="/settings/api-keys" className={buttonClass("primary")}>
					Open API keys
				</Link>
			</DocSection>

			<DocSection title="What a key can do">
				<div className="grid gap-3 sm:grid-cols-2">
					<div className="panel p-5">
						<AbilityBadge ability="read" />
						<p className="mt-3 text-sm text-ink-700">Search boards, read a board and its free days, and see the account and its bookings.</p>
					</div>
					<div className="panel p-5">
						<AbilityBadge ability="book" />
						<p className="mt-3 text-sm text-ink-700">Everything a read key does, and also hold dates, start payment and cancel. Booking needs the account to have the advertiser role.</p>
					</div>
				</div>
				<p className="text-sm text-ink-500">A read key that tries to book gets 403. Give each tool the least it needs.</p>
			</DocSection>

			<DocSection title="Send the key">
				<p>Put the key in the Authorization header as a bearer token on every request, and ask for JSON.</p>
				<CodeBlock
					label="Request"
					code={`curl "${base}/me" \\
  -H "Authorization: Bearer gbk_your_key" \\
  -H "Accept: application/json"`}
				/>
				<p className="text-sm text-ink-500">
					The sign-in tokens our apps use don't work here, and API keys don't work on the apps' own routes. Keep the two apart.
				</p>
			</DocSection>

			<DocSection title="Keep keys safe">
				<ul className="space-y-2">
					{[
						"Call the API from your server, never from a web page or app that people download. Anyone holding the key can act as your account.",
						"Keep the key in a secret store or an environment variable, not in your code.",
						"If a key leaks, remove it in Settings. It stops working straight away. Then make a new one.",
						"Settings shows when each key was last used, so you can spot one you don't recognise.",
					].map((tip) => (
						<li key={tip} className="flex items-start gap-2.5">
							<ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-available" aria-hidden />
							<span>{tip}</span>
						</li>
					))}
				</ul>
			</DocSection>
		</div>
	);
}
