import { useState } from "react";
import { Form, useNavigation } from "react-router";
import { Check, Copy, KeyRound, MonitorPlay, Unplug } from "lucide-react";
import type { BoardDetail } from "@greyboards/types";
import { Button, Spinner } from "~/components/ui";

/**
 * Connects a digital screen's player. The owner makes a token, which shows once, and pastes
 * it into the software running the screen. The player then fetches what to play and reports
 * each play, which advertisers see on their booking.
 */
export function ScreenPlayerPanel({ board, token, apiUrl }: { board: BoardDetail; token: string | null; apiUrl: string }) {
	const navigation = useNavigation();
	const busy = (intent: string) => navigation.formData?.get("intent") === intent;
	const [copied, setCopied] = useState(false);
	const player = board.player;
	const base = apiUrl.replace(/\/+$/, "");

	if (!player) return null;

	const copy = async () => {
		if (!token) return;

		await navigator.clipboard?.writeText(token).catch(() => undefined);
		setCopied(true);
	};

	return (
		<div className="panel space-y-4 p-5 sm:p-6">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h2 className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-ink-900">
					<MonitorPlay className="h-5 w-5 text-brand-600" aria-hidden />
					Screen player
				</h2>
				<span className={`rounded-full px-2.5 py-1 text-xs font-bold ${player.connected ? "bg-emerald-50 text-emerald-800" : "bg-surface-100 text-ink-700"}`}>
					{player.connected ? (player.seenAt ? `Last seen ${new Date(player.seenAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}` : "Waiting to connect") : "Not connected"}
				</span>
			</div>
			<p className="text-sm text-ink-500">
				Connect your screen's player so it knows what to play. Advertisers can see each time their ad plays.
			</p>

			{token && (
				<div className="space-y-2 rounded-2xl border-[1.5px] border-brand-200 bg-brand-50 p-4">
					<p className="text-sm font-semibold text-ink-900">Copy this into your player now. You won't see it again.</p>
					<div className="flex items-center gap-2">
						<code className="min-w-0 flex-1 truncate rounded-xl bg-white px-3 py-2 text-xs text-ink-900">{token}</code>
						<Button type="button" variant="secondary" onClick={copy}>
							{copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
							{copied ? "Copied" : "Copy"}
						</Button>
					</div>
				</div>
			)}

			<details className="rounded-2xl bg-canvas p-4 text-sm text-ink-700">
				<summary className="cursor-pointer font-semibold text-ink-900">Setup details for your player</summary>
				<ul className="mt-3 space-y-2">
					<li>
						Send <code className="rounded bg-white px-1">Authorization: Bearer &lt;token&gt;</code> with each request.
					</li>
					<li>
						<code className="rounded bg-white px-1">GET {base}/player/schedule?day=YYYY-MM-DD</code> lists the ads to play, each with its slots in the loop, its hours (screen's local time) and the artwork.
					</li>
					<li>
						<code className="rounded bg-white px-1">POST {base}/player/plays</code> with{" "}
						<code className="rounded bg-white px-1">{`{ "plays": [{ "bookingId", "playedAt", "durationMs" }] }`}</code> logs plays. A play sent twice counts once.
					</li>
				</ul>
			</details>

			<div className="flex flex-wrap gap-2">
				<Form method="post" preventScrollReset>
					<input type="hidden" name="intent" value="player-token" />
					<Button confirm={player.connected ? { title: "Create a new token?", message: "The screen using the old one disconnects.", action: "Create token", danger: true } : undefined} type="submit" variant={player.connected ? "secondary" : "primary"} disabled={busy("player-token")}>
						{busy("player-token") ? <Spinner /> : <KeyRound className="h-4 w-4" aria-hidden />}
						{player.connected ? "Create a new token" : "Connect a player"}
					</Button>
				</Form>
				{player.connected && (
					<Form method="post" preventScrollReset>
						<input type="hidden" name="intent" value="player-revoke" />
						<Button type="submit" variant="secondary" disabled={busy("player-revoke")} confirm={{ title: "Disconnect the screen?", message: "It stops showing ads until you link it again.", action: "Disconnect", danger: true }}>
							{busy("player-revoke") ? <Spinner /> : <Unplug className="h-4 w-4" aria-hidden />}
							Disconnect
						</Button>
					</Form>
				)}
			</div>
		</div>
	);
}
