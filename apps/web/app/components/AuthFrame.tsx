import type { ReactNode } from "react";
import { Camera, CircleCheck, MapPinned } from "lucide-react";
import { Logo } from "~/components/ui";

const PROMISES = [
	{ icon: MapPinned, text: "Find boards anywhere on a live map" },
	{ icon: Camera, text: "See photo proof your ad went up" },
	{ icon: CircleCheck, text: "Pay only when it's up" },
];

/** Layout for the sign-in, sign-up and account recovery pages: the form beside the Greyboards promise. */
export function AuthFrame({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
	return (
		<div className="flex min-h-dvh bg-white">
			<aside className="relative isolate hidden w-[44%] overflow-hidden bg-brand-sweep lg:block">
				<div className="flex h-full flex-col justify-between p-10">
					<Logo light />
					<div>
						<p className="max-w-sm font-display text-3xl leading-tight font-bold text-white">Book it, see it, pay only when it's up.</p>
						<ul className="mt-8 space-y-3">
							{PROMISES.map((promise) => (
								<li key={promise.text} className="flex items-center gap-3 text-brand-50">
									<promise.icon className="h-5 w-5 shrink-0" aria-hidden />
									{promise.text}
								</li>
							))}
						</ul>
					</div>
				</div>
			</aside>
			<main className="flex flex-1 flex-col px-4 py-5 sm:px-10">
				<div className="lg:hidden">
					<Logo />
				</div>
				<div className="flex flex-1 items-start justify-center pt-10 sm:items-center sm:pt-0">
					<div className="w-full max-w-sm">
						<h1 className="font-display text-3xl font-bold tracking-tight text-ink-900">{title}</h1>
						<p className="mt-2 text-sm text-ink-500">{subtitle}</p>
						<div className="mt-8">{children}</div>
					</div>
				</div>
			</main>
		</div>
	);
}
