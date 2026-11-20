import { Form, useNavigation } from "react-router";
import { Check, CreditCard, HandCoins, MessageSquareQuote, Send, Undo2, X } from "lucide-react";
import { type PrintJob, type PrintOffer, type PrintOptions, currencySymbol } from "@greyboards/types";
import { Avatar } from "~/components/Avatar";
import { formatDay, formatMoney } from "~/components/bookings/BookingBits";
import { Button, Field, Input, Spinner } from "~/components/ui";
import { formatDistance } from "./JobBits";
import { Standing } from "~/components/reputation/Badges";

/** "Open until 21 Nov, 4 PM", for a price or a request. */
function until(offer: PrintOffer) {
	const at = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "numeric", hour12: true, timeZone: "Africa/Lagos" }).format(new Date(offer.expiresAt));

	return offer.status === "requested" ? `Reply by ${at}` : `Open until ${at}`;
}

/**
 * For the advertiser: the prices dispatchers sent for a print job, to pay the one they pick,
 * and dispatchers nearby to ask at their own rate. The job is theirs once it's paid.
 */
export function PrintOffersPanel({ options, currency }: { options: PrintOptions; currency: string }) {
	const navigation = useNavigation();
	const busy = navigation.formData?.get("intent");
	const busyId = navigation.formData?.get("offerId") ?? navigation.formData?.get("dispatcherId");
	const waiting = options.offers.filter((offer) => offer.status === "requested").length;

	return (
		<div className="panel space-y-5 p-5 sm:p-6">
			<div className="flex items-start gap-3">
				<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
					<HandCoins className="h-5 w-5" aria-hidden />
				</span>
				<div>
					<h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900">Choose who prints it</h2>
					<p className="mt-0.5 text-sm text-ink-500">Local dispatchers will send you quotes, or you can ask one directly. Pick a quote and pay, and they'll print and put up your ad.</p>
				</div>
			</div>

			<div className="space-y-2">
				<h3 className="text-sm font-semibold text-ink-900">Prices</h3>
				{options.offers.length ? (
					<ul className="divide-y divide-surface-200 rounded-2xl bg-surface-100">
						{options.offers.map((offer) => (
							<li key={offer.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
								{offer.dispatcher && <Avatar user={offer.dispatcher} />}
								<span className="min-w-0 flex-1">
									<span className="block font-semibold text-ink-900">
										{offer.dispatcher?.name ?? "A dispatcher"} · <span className="tabular-nums">{formatMoney(offer.amountMinor, currency)}</span>
									</span>
									<Standing standing={offer.dispatcher?.standing} compact className="my-1" />
									{offer.note && <span className="block text-ink-700">{offer.note}</span>}
									<span className="block text-xs text-ink-500">
										{offer.kind === "request" ? (offer.status === "requested" ? "You asked them directly. " : "They accepted your request. ") : ""}
										{until(offer)}
									</span>
								</span>
								{offer.status === "pending" ? (
									<Form method="post">
										<input type="hidden" name="intent" value="pay-print" />
										<input type="hidden" name="offerId" value={offer.id} />
										<Button confirm={{ title: `Pay ${formatMoney(offer.amountMinor, currency)} for printing?`, action: "Pay" }} type="submit" disabled={!!busy}>
											{busy === "pay-print" && busyId === offer.id ? <Spinner /> : <CreditCard className="h-4 w-4" aria-hidden />}
											Pay {formatMoney(offer.amountMinor, currency)}
										</Button>
									</Form>
								) : (
									<span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-held">Waiting for a reply</span>
								)}
							</li>
						))}
					</ul>
				) : (
					<p className="rounded-2xl bg-surface-100 px-4 py-3 text-sm text-ink-500">No quotes yet. Local dispatchers can see your job, or you can ask one below.</p>
				)}
			</div>

			{!!options.dispatchers.length && (
				<div className="space-y-2">
					<h3 className="text-sm font-semibold text-ink-900">Ask a dispatcher</h3>
					<ul className="divide-y divide-surface-200 rounded-2xl bg-surface-100">
						{options.dispatchers.map((dispatcher) => (
							<li key={dispatcher.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
								<Avatar user={dispatcher} />
								<span className="min-w-0 flex-1">
									<span className="block font-semibold text-ink-900">
										{dispatcher.name} · <span className="tabular-nums">{formatMoney(dispatcher.quoteMinor, currency)}</span>
									</span>
									<Standing standing={dispatcher.standing} compact className="my-1" />
									<span className="block text-xs text-ink-500">
										Based {formatDistance(dispatcher.distanceM)} away{dispatcher.note ? `. ${dispatcher.note}` : ""}
									</span>
								</span>
								<Form method="post">
									<input type="hidden" name="intent" value="ask-dispatcher" />
									<input type="hidden" name="dispatcherId" value={dispatcher.id} />
									<Button confirm={{ title: `Ask ${dispatcher.name}?`, message: "They'll get a request to print and put up your ad.", action: "Ask" }} type="submit" variant="secondary" disabled={!!busy || dispatcher.asked || waiting >= options.maxRequests}>
										{busy === "ask-dispatcher" && busyId === dispatcher.id ? <Spinner /> : <Send className="h-4 w-4" aria-hidden />}
										{dispatcher.asked ? "Asked" : "Ask"}
									</Button>
								</Form>
							</li>
						))}
					</ul>
					<p className="text-xs text-ink-500">You can ask {options.maxRequests} at a time. Pay once they accept.</p>
				</div>
			)}
		</div>
	);
}

/**
 * For a dispatcher on an open job nobody has paid for: send a price, change or take it back,
 * or answer the advertiser's request at their rate.
 */
export function SendPrice({ job, fieldError }: { job: PrintJob; fieldError?: string }) {
	const navigation = useNavigation();
	const intent = navigation.formData?.get("intent");
	const offer = job.myOffer;

	if (offer?.status === "requested") {
		return (
			<div className="space-y-3">
				<p className="flex items-start gap-2 rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
					<MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
					The advertiser asked you to do this job at your rate, {formatMoney(offer.amountMinor, offer.currency)}. {until(offer)}.
				</p>
				<div className="flex flex-wrap gap-2">
					<Form method="post">
						<input type="hidden" name="intent" value="accept-request" />
						<input type="hidden" name="offerId" value={offer.id} />
						<Button confirm={{ title: "Take this job?", message: "You'll be expected to print and put it up by the date.", action: "Take it" }} type="submit" disabled={!!intent}>
							{intent === "accept-request" ? <Spinner /> : <Check className="h-4 w-4" aria-hidden />}
							Accept
						</Button>
					</Form>
					<Form method="post">
						<input type="hidden" name="intent" value="decline-request" />
						<input type="hidden" name="offerId" value={offer.id} />
						<Button type="submit" variant="ghost" disabled={!!intent} confirm={{ title: "Turn this job down?", action: "Turn it down", danger: true }}>
							<X className="h-4 w-4" aria-hidden />
							Decline
						</Button>
					</Form>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{offer?.status === "pending" && (
				<p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
					Your price of {formatMoney(offer.amountMinor, offer.currency)} is with the advertiser. {until(offer)}. The job is yours if they pay it.
				</p>
			)}
			<Form method="post" className="grid gap-3 sm:grid-cols-[1fr_1.4fr]">
				<Field label={offer ? "New price" : "Your price"} error={fieldError}>
					<Input name="amount" inputMode="numeric" required defaultValue={offer ? String(offer.amountMinor / 100) : ""} placeholder="175000" addon={currencySymbol(job.currency)} />
				</Field>
				<Field label="Note for the advertiser" hint="Optional. For example, the material or when you can put it up.">
					<Input name="note" maxLength={200} defaultValue={offer?.note ?? ""} />
				</Field>
				<div className="flex flex-wrap gap-2 sm:col-span-2">
					<Button confirm={{ title: offer ? "Change your price?" : "Send your price?", action: offer ? "Change price" : "Send price" }} type="submit" name="intent" value="send-price" disabled={!!intent}>
						{intent === "send-price" ? <Spinner /> : <Send className="h-4 w-4" aria-hidden />}
						{offer ? "Change price" : "Send price"}
					</Button>
					{offer?.status === "pending" && (
						<Button
							type="submit"
							variant="ghost"
							name="intent"
							value="withdraw-price"
							disabled={!!intent}
							formNoValidate
							confirm={{ title: "Withdraw your price?", message: "The advertiser won't be able to accept it any more.", action: "Withdraw", danger: true }}
						>
							<Undo2 className="h-4 w-4" aria-hidden />
							Withdraw
						</Button>
					)}
				</div>
			</Form>
			<p className="text-xs text-ink-500">Include printing, transport and putting it up by {formatDay(job.dueOn)}. You see the artwork once the job is yours. Missing the print or go-live date loses you the job, and repeated misses suspend your dispatcher role.</p>
		</div>
	);
}
