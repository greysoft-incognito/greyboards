import type { ReactNode } from "react";
import { Camera, Globe, MapPinned } from "lucide-react";
import { Logo } from "~/components/ui";
import { BoardScene } from "~/components/BoardScene";

const PROMISES = [
	{ icon: MapPinned, text: "Explore real boards on a live map" },
	{ icon: Camera, text: "Watch your ad go up from anywhere" },
	{ icon: Globe, text: "Reach people in any city" },
];

/** Layout for the sign-in, sign-up and account recovery pages: the form beside a board at dusk and the Greyboards promise. */
export function AuthFrame({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
	return (
		<div className="flex min-h-dvh bg-white lg:p-3">
			<aside className="relative hidden w-[46%] flex-col overflow-hidden rounded-[1.75rem] bg-[#2a2229] lg:flex">
				<div className="relative aspect-[400/260] w-full">
					<BoardScene time="dusk" art="brand" headline="Your ad here" />
					<div className="glass absolute top-6 left-6 rounded-2xl px-4 py-2.5">
						<Logo />
					</div>
				</div>
				<div className="flex flex-1 flex-col justify-center p-10">
					<div>
						<p className="max-w-sm font-display text-3xl leading-tight font-extrabold tracking-tight text-white">Your brand, on billboards anywhere.</p>
						<ul className="mt-6 space-y-3">
							{PROMISES.map((promise) => (
								<li key={promise.text} className="flex items-center gap-3 text-brand-50">
									<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand-100">
										<promise.icon className="h-4 w-4" aria-hidden />
									</span>
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
						<h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-ink-900">{title}</h1>
						<p className="mt-2 text-sm text-ink-500">{subtitle}</p>
						<div className="mt-8">{children}</div>
					</div>
				</div>
			</main>
		</div>
	);
}
