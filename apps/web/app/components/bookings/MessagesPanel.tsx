import { useEffect, useRef } from "react";
import { Form, useNavigation } from "react-router";
import { ImagePlus, MessagesSquare, Send } from "lucide-react";
import type { BookingMessage, MessageSide } from "@greyboards/types";
import { Avatar } from "~/components/Avatar";
import { Button, Spinner, Textarea } from "~/components/ui";

const SIDES: Record<MessageSide, string> = {
	advertiser: "Advertiser",
	board: "Board owner's side",
	dispatch: "Dispatch",
	staff: "Greyboards",
};

/** "Tue 3 Feb, 14:05" in the reader's time. */
function formatSent(moment: string) {
	return new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(moment));
}

/**
 * Messages about the booking between the advertiser, whoever looks after the board and the
 * dispatcher, oldest at the top. A photo can go with a message as evidence.
 */
export function MessagesPanel({ messages, more }: { messages: BookingMessage[]; more: boolean }) {
	const navigation = useNavigation();
	const busy = navigation.formData?.get("intent") === "message";
	const form = useRef<HTMLFormElement>(null);
	const sending = useRef(false);

	useEffect(() => {
		if (busy) sending.current = true;
		else if (sending.current && navigation.state === "idle") {
			sending.current = false;
			form.current?.reset();
		}
	}, [busy, navigation.state]);

	return (
		<div className="panel space-y-4 p-5 sm:p-6">
			<div>
				<h2 className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-ink-900">
					<MessagesSquare className="h-5 w-5 text-brand-600" aria-hidden />
					Messages
				</h2>
				<p className="mt-1 text-sm text-ink-500">Agree details here so they stay with the booking. Owners without the app get these by SMS.</p>
			</div>

			{more && <p className="text-center text-xs text-ink-500">Older messages aren't shown here.</p>}
			{messages.length > 0 ? (
				<ol className="space-y-3">
					{[...messages].reverse().map((message) => (
						<li key={message.id} className={`flex gap-2.5 ${message.mine ? "flex-row-reverse" : ""}`}>
							<Avatar user={{ name: message.author?.name ?? "Greyboards", avatarUrl: message.author?.avatarUrl ?? null }} size="xs" />
							<div className={`max-w-[80%] space-y-1 ${message.mine ? "text-right" : ""}`}>
								<p className="text-xs text-ink-500">
									<span className="font-semibold text-ink-700">{message.mine ? "You" : (message.author?.name ?? "Greyboards")}</span>
									{message.author && !message.mine ? ` · ${SIDES[message.author.side]}` : ""} · {formatSent(message.createdAt)}
								</p>
								{message.body && <p className={`inline-block rounded-2xl px-3.5 py-2 text-left text-sm whitespace-pre-line ${message.mine ? "bg-brand-600 text-white" : "bg-surface-100 text-ink-900"}`}>{message.body}</p>}
								{message.photo && (
									<a href={message.photo.url} target="_blank" rel="noreferrer" className="block">
										<img src={message.photo.url} alt="" loading="lazy" className="max-h-56 rounded-2xl object-cover" />
									</a>
								)}
							</div>
						</li>
					))}
				</ol>
			) : (
				<p className="rounded-2xl bg-surface-100 px-4 py-3 text-sm text-ink-500">No messages yet.</p>
			)}

			<Form ref={form} method="post" encType="multipart/form-data" preventScrollReset className="space-y-2">
				<input type="hidden" name="intent" value="message" />
				<Textarea name="body" rows={2} maxLength={2000} placeholder="Write a message" aria-label="Message" />
				<div className="flex items-center justify-between gap-2">
					<label className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-ink-700 hover:bg-surface-100">
						<ImagePlus className="h-4 w-4" aria-hidden />
						Add a photo
						<input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/heic" className="sr-only" />
					</label>
					<Button type="submit" disabled={busy}>
						{busy ? <Spinner /> : <Send className="h-4 w-4" aria-hidden />}
						Send
					</Button>
				</div>
			</Form>
		</div>
	);
}
