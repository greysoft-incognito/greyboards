import { Link, redirect } from "react-router";
import { ArrowRight, Camera, Map, ShieldCheck, Wallet } from "lucide-react";
import { optionalUser } from "~/lib/session.server";
import { ROLE_ICONS } from "~/components/AccountRoles";
import { Logo, buttonClass } from "~/components/ui";
import { SiteFooter } from "~/components/SiteFooter";
import { BoardScene } from "~/components/BoardScene";
import { MapBackdrop, MapPin } from "~/components/MapBackdrop";
import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "Greyboards · Your brand on billboards anywhere" },
		{
			name: "description",
			content: "Explore billboards around the world on a live map, book the one that fits your brand and watch your ad go up from wherever you are.",
		},
	];
}

export async function loader({ request, context }: Route.LoaderArgs) {
	if (await optionalUser(request, context)) throw redirect("/dashboard");

	return { deleted: new URL(request.url).searchParams.has("deleted") };
}

const STEPS = [
	{ icon: Map, title: "Find a board", text: "Explore real boards on a live map, with photos, size and the traffic that passes them." },
	{ icon: ShieldCheck, title: "Book it", text: "Pick your dates and upload your artwork. That's it." },
	{ icon: Camera, title: "See it go up", text: "Photos taken at the board show your ad live, wherever you are in the world." },
	{ icon: Wallet, title: "Rest easy", text: "We hold your payment until your ad is up, so you never pay for a blank board." },
];

const ROLES = [
	{ kind: "advertiser", title: "Advertisers", text: "Put your brand on the right streets in any city, and follow every campaign from one place.", time: "dusk", art: "brand", headline: "Summer is here" },
	{ kind: "owner", title: "Board owners", text: "Fill your boards with great brands. A scout can list and run them for you.", time: "day", art: "empty", headline: "Your ad here" },
	{ kind: "scout", title: "Scouts", text: "Find boards, sign up their owners and earn on every booking they get.", time: "night", art: "dark", headline: "Fresh daily" },
	{ kind: "dispatch", title: "Dispatchers", text: "Print and put up ads on boards near you, and earn on every job.", time: "day", art: "brand", headline: "Up by Friday" },
] as const;

/** Price tags on the drawn map, placed in percent of the hero. */
const PINS = [
	{ label: "₦1.2m", tone: "available", x: 66, y: 74, active: true },
	{ label: "₦350k", tone: "available", x: 56, y: 30 },
	{ label: "Bid", tone: "bid", x: 80, y: 44 },
	{ label: "₦600k", tone: "available", x: 47, y: 58 },
	{ label: "Booked", tone: "booked", x: 88, y: 88 },
] as const;

export default function Home({ loaderData }: Route.ComponentProps) {
	return (
		<div className="min-h-dvh bg-canvas">
			{loaderData.deleted && <p className="bg-ink-900 px-6 py-3 text-center text-sm text-white">Your account was deleted. Thank you for using Greyboards.</p>}

			<section className="relative isolate overflow-hidden">
				<div className="absolute inset-0 -z-10">
					<MapBackdrop />
				</div>
				<div className="pointer-events-none absolute inset-0 -z-10 max-lg:hidden" aria-hidden>
					{PINS.map((pin) => (
						<MapPin key={pin.label} label={pin.label} tone={pin.tone} active={"active" in pin} at={{ x: pin.x, y: pin.y }} />
					))}
				</div>

				<header className="glass mx-4 mt-4 flex items-center justify-between gap-3 rounded-[1.25rem] py-2.5 pr-3 pl-4 sm:mx-6">
					<Logo />
					<nav className="flex items-center gap-1 sm:gap-2">
						<Link prefetch="intent" to="/about" className={buttonClass("ghost", "max-sm:hidden")}>
							How it works
						</Link>
						<Link prefetch="intent" to="/signin" className={buttonClass("ghost")}>
							Sign in
						</Link>
						<Link prefetch="intent" to="/signup" className={buttonClass("primary")}>
							Get started
						</Link>
					</nav>
				</header>

				<div className="mx-auto grid max-w-7xl items-end gap-6 px-4 pt-10 pb-12 sm:px-6 lg:min-h-[44rem] lg:grid-cols-[minmax(0,30rem)_1fr] lg:pt-16 lg:pb-16">
					<div className="glass rounded-[1.75rem] p-6 sm:p-8 lg:self-center">
						<h1 className="font-display text-4xl leading-[1.08] font-extrabold tracking-[-0.03em] text-ink-900 sm:text-5xl">Your brand, on billboards anywhere.</h1>
						<p className="mt-4 text-lg text-ink-500">Explore real boards on a live map, pick the one that fits your brand and watch your ad go up from wherever you are.</p>
						<div className="mt-7 flex flex-wrap gap-3">
							<Link prefetch="intent" to="/signup" className={buttonClass("primary", "min-h-12 px-6 text-base")}>
								Get started
								<ArrowRight className="h-5 w-5" aria-hidden />
							</Link>
							<Link prefetch="intent" to="/signin" className={buttonClass("secondary", "min-h-12 px-6 text-base")}>
								I have an account
							</Link>
						</div>
					</div>

					<article className="w-full max-w-sm justify-self-end overflow-hidden rounded-[1.5rem] bg-white shadow-[0_1px_2px_rgba(30,31,34,0.08),0_24px_60px_rgba(30,31,34,0.18)]">
						<div className="relative aspect-[400/260]">
							<BoardScene time="dusk" art="brand" />
							<span className="absolute top-3.5 left-3.5 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1.5 text-xs font-bold text-available">
								<span className="h-1.5 w-1.5 rounded-full bg-available" aria-hidden />
								Verified on site
							</span>
						</div>
						<div className="p-5">
							<p className="font-display text-lg font-extrabold tracking-tight text-ink-900">Ahmadu Bello Way, Kaduna</p>
							<p className="mt-1 text-sm text-ink-500">Static · 12 × 4 m · faces east · lit at night</p>
							<div className="mt-4 flex items-center justify-between gap-3">
								<div>
									<p className="text-xs text-ink-500">per month</p>
									<p className="font-display text-xl font-extrabold tabular-nums">₦1,200,000</p>
								</div>
								<Link prefetch="intent" to="/signup" className={buttonClass("primary")}>
									Book this board
									<ArrowRight className="h-4 w-4" aria-hidden />
								</Link>
							</div>
						</div>
					</article>
				</div>
			</section>

			<main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
				<h2 className="font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">How it works</h2>
				<ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{STEPS.map((step, index) => (
						<li key={step.title} className="panel lift p-6">
							<div className="flex items-center justify-between">
								<span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
									<step.icon className="h-5 w-5" aria-hidden />
								</span>
								<span className="font-display text-sm font-bold text-surface-300">0{index + 1}</span>
							</div>
							<p className="mt-5 font-display text-lg font-bold text-ink-900">{step.title}</p>
							<p className="mt-2 text-ink-500">{step.text}</p>
						</li>
					))}
				</ol>

				<h2 className="mt-20 font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">For everyone who keeps boards busy</h2>
				<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{ROLES.map((role) => {
						const Icon = ROLE_ICONS[role.kind];

						return (
							<div key={role.kind} className="panel lift overflow-hidden">
								<div className="aspect-[400/220]">
									<BoardScene time={role.time} art={role.art} headline={role.headline} />
								</div>
								<div className="p-6">
									<div className="flex items-center gap-3">
										<span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
											<Icon className="h-5 w-5" aria-hidden />
										</span>
										<p className="font-display text-lg font-bold text-ink-900">{role.title}</p>
									</div>
									<p className="mt-3 text-ink-500">{role.text}</p>
								</div>
							</div>
						);
					})}
				</div>

				<div className="bg-brand-sweep mt-20 flex flex-col items-start gap-6 rounded-[1.75rem] p-8 text-white shadow-[0_16px_36px_rgba(88,38,52,0.35)] sm:flex-row sm:items-center sm:justify-between sm:p-10">
					<div>
						<p className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Your next board is already on the map.</p>
						<p className="mt-2 text-brand-100">Create an account in a minute and start exploring.</p>
					</div>
					<Link prefetch="intent" to="/signup" className={buttonClass("secondary", "min-h-12 px-6 text-base")}>
						Get started
						<ArrowRight className="h-5 w-5" aria-hidden />
					</Link>
				</div>
			</main>
			<SiteFooter />
		</div>
	);
}
