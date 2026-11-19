import { Link } from "react-router";
import { ArrowRight, Circle, CircleCheck } from "lucide-react";
import type { PartnerChecks, PartnerRequirement } from "@greyboards/types";

interface Step {
	label: string;
	done: boolean;
	link?: { to: string; label: string };
}

/** Each thing a scout or dispatcher sends, worded for where they are with it. */
function step(requirement: PartnerRequirement, checks: PartnerChecks): Step {
	const done = !checks.missing.includes(requirement);

	if (requirement === "bank") {
		return done ? { label: "Bank account added", done } : { label: "Add the bank account we'll pay you into", done, link: { to: "/settings/payouts", label: "Add it" } };
	}

	if (done) return { label: checks.identity?.status === "verified" ? "ID checked" : "ID sent", done };

	return { label: checks.identity ? "Send a clearer photo of your ID" : "Send a photo of your ID", done, link: { to: "#your-id", label: "Send it" } };
}

/** What a waiting application still needs before we can approve it. */
export function ApplicationChecklist({ checks }: { checks: PartnerChecks }) {
	if (!checks.required.length) return null;

	const steps = checks.required.map((requirement) => step(requirement, checks));
	const ready = !checks.missing.length;

	return (
		<section id="finish" className="panel scroll-mt-24 p-5 sm:p-6">
			<h2 className="font-display text-xl font-bold text-ink-900">{ready ? "You're all set" : "Finish your application"}</h2>
			<p className="mt-1 text-sm text-ink-500">{ready ? "We'll review your application and email you." : "We can only approve you once these are in."}</p>
			<ul className="mt-4 space-y-2">
				{steps.map((item) => (
					<li key={item.label} className="flex items-center gap-3 rounded-2xl bg-surface-100 px-4 py-3 text-sm">
						{item.done ? <CircleCheck className="h-5 w-5 shrink-0 text-available" aria-hidden /> : <Circle className="h-5 w-5 shrink-0 text-ink-500" aria-hidden />}
						<span className={`flex-1 ${item.done ? "text-ink-500" : "font-semibold text-ink-900"}`}>
							{item.label}
							<span className="sr-only">{item.done ? " (done)" : " (to do)"}</span>
						</span>
						{item.link &&
							(item.link.to.startsWith("#") ? (
								<a href={item.link.to} className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
									{item.link.label}
									<ArrowRight className="h-4 w-4" aria-hidden />
								</a>
							) : (
								<Link prefetch="intent" to={item.link.to} className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
									{item.link.label}
									<ArrowRight className="h-4 w-4" aria-hidden />
								</Link>
							))}
					</li>
				))}
			</ul>
		</section>
	);
}

/** Takes the account to what its application still needs. */
export function FinishApplicationLink({ className = "" }: { className?: string }) {
	return (
		<Link prefetch="intent" to="/settings/roles#finish" className={`inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline ${className}`}>
			Finish your application
			<ArrowRight className="h-4 w-4" aria-hidden />
		</Link>
	);
}
