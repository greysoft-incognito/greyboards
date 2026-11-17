import { Link, redirect } from "react-router";
import { Camera, Map, MapPinned, ShieldCheck, Wallet } from "lucide-react";
import { optionalUser } from "~/lib/session.server";
import { ROLE_ICONS } from "~/components/AccountRoles";
import { Logo, buttonClass } from "~/components/ui";
import { SiteFooter } from "~/components/SiteFooter";
import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "Greyboards · Billboards anywhere, booked online" },
		{
			name: "description",
			content: "Find a billboard anywhere, book it, upload your artwork and see photo proof it went up. Pay only when it's up.",
		},
	];
}

export async function loader({ request, context }: Route.LoaderArgs) {
	if (await optionalUser(request, context)) throw redirect("/dashboard");

	return { deleted: new URL(request.url).searchParams.has("deleted") };
}

const STEPS = [
	{ icon: Map, title: "Find a board", text: "Search a live map of verified boards. See each one's photos, size and which way it faces." },
	{ icon: ShieldCheck, title: "Book it", text: "Pick your dates and upload your artwork. We hold your payment, not the owner." },
	{ icon: Camera, title: "See it go up", text: "Geotagged photos from the site show your ad on the board, without you ever visiting." },
	{ icon: Wallet, title: "Pay when it's up", text: "The owner is paid only once the proof is accepted." },
];

const ROLES = [
	{ kind: "advertiser", title: "Advertisers", text: "Book boards anywhere in the world and track every campaign from one place." },
	{ kind: "owner", title: "Board owners", text: "A scout signs you up and runs your board. You get texts and bank transfers." },
	{ kind: "scout", title: "Scouts", text: "Find boards, sign their owners and earn on every booking of the boards you bring in." },
	{ kind: "billposter", title: "Billposters", text: "Reserve print-and-post jobs near you and get paid once the proof is accepted." },
] as const;

export default function Home({ loaderData }: Route.ComponentProps) {
	return (
		<div className="min-h-dvh bg-canvas">
			{loaderData.deleted && <p className="bg-ink-900 px-6 py-3 text-center text-sm text-white">Your account was deleted. Thank you for using Greyboards.</p>}

			<section className="relative isolate overflow-hidden bg-brand-sweep">
				<header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
					<Logo light />
					<nav className="flex items-center gap-1 sm:gap-2">
						<Link prefetch="intent" to="/about" className={buttonClass("ghost", "!text-white hover:!bg-white/10 max-sm:hidden")}>
							How it works
						</Link>
						<Link prefetch="intent" to="/signin" className={buttonClass("ghost", "!text-white hover:!bg-white/10")}>
							Sign in
						</Link>
						<Link prefetch="intent" to="/signup" className={buttonClass("secondary", "!border-white !text-brand-700")}>
							Get started
						</Link>
					</nav>
				</header>
				<div className="mx-auto max-w-3xl px-4 pt-20 pb-28 text-center sm:px-6 sm:pt-28 sm:pb-36">
					<p className="mx-auto inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-brand-50">
						<MapPinned className="h-4 w-4" aria-hidden />
						Billboards anywhere, booked online
					</p>
					<h1 className="mt-6 font-display text-4xl leading-tight font-extrabold tracking-tight text-white sm:text-6xl">Book it, see it, pay only when it's up.</h1>
					<p className="mx-auto mt-5 max-w-xl text-lg text-white/80">
						Find a board on the map, upload your artwork and get photo proof it went up, without ever visiting the site.
					</p>
					<div className="mt-9 flex flex-wrap justify-center gap-3">
						<Link prefetch="intent" to="/signup" className={buttonClass("secondary", "px-6 py-3.5 text-base !border-white !text-brand-700")}>
							Get started
						</Link>
						<Link
							prefetch="intent"
							to="/signin"
							className={buttonClass("secondary", "px-6 py-3.5 text-base !border-white/30 !bg-white/10 !text-white hover:!bg-white/20")}
						>
							I have an account
						</Link>
					</div>
				</div>
			</section>

			<main className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
				<h2 className="font-display text-3xl font-bold tracking-tight text-ink-900">How it works</h2>
				<ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{STEPS.map((step) => (
						<li key={step.title} className="panel rounded-2xl p-6">
							<step.icon className="h-6 w-6 text-brand-500" aria-hidden />
							<p className="mt-4 font-display text-lg font-bold text-ink-900">{step.title}</p>
							<p className="mt-2 text-ink-500">{step.text}</p>
						</li>
					))}
				</ol>

				<h2 className="mt-20 font-display text-3xl font-bold tracking-tight text-ink-900">For everyone who keeps boards busy</h2>
				<div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{ROLES.map((role) => {
						const Icon = ROLE_ICONS[role.kind];

						return (
							<div key={role.kind} className="panel rounded-2xl p-6">
								<span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
									<Icon className="h-5 w-5" aria-hidden />
								</span>
								<p className="mt-4 font-display text-lg font-bold text-ink-900">{role.title}</p>
								<p className="mt-2 text-ink-500">{role.text}</p>
							</div>
						);
					})}
				</div>
			</main>
			<SiteFooter />
		</div>
	);
}
