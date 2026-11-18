import { Form, useNavigation } from "react-router";
import { Fragment } from "react";
import { BadgeCheck, Landmark, Wallet } from "lucide-react";
import type { Bank, Payout, PayoutAccount } from "@greyboards/types";
import { formatDay, formatMoney } from "~/components/bookings/BookingBits";
import { PageHeader, Section, resultFor } from "~/components/settings/Section";
import { Button, Field, Input, Notice, Select, Spinner } from "~/components/ui";
import { requireUser } from "~/lib/session.server";
import { settingsAction } from "~/lib/settings.server";
import { useToastMessage } from "~/lib/toast";
import type { Route } from "./+types/payouts";

export const meta = () => [{ title: "Payouts · Settings · Greyboards" }];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireUser(request, context);
	const [{ data: summary }, { data: banks }, { data: history }] = await Promise.all([api.account.payouts(), api.banks(), api.account.payoutHistory({ per_page: 20 })]);

	return { summary, banks, history };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireUser(request, context);
	const form = await request.formData();
	const profileId = String(form.get("profileId") ?? "");
	const details = { bankCode: String(form.get("bankCode") ?? ""), accountNumber: String(form.get("accountNumber") ?? "").replace(/\s/g, "") };
	const intent = profileId ? `owner-${profileId}` : "own";

	return settingsAction(intent, async () => {
		const { data } = profileId ? await api.account.saveOwnerPayoutAccount(profileId, details) : await api.account.savePayoutAccount(details);

		return { message: `Payouts go to ${data.accountName}.` };
	});
}

const STATUS = { processing: "On its way", paid: "Paid", failed: "Failed, we'll try again" } as const;

/** Where the account, and each owner it looks after, is paid, with what's owed and what was sent. */
export default function Payouts({ loaderData, actionData }: Route.ComponentProps) {
	useToastMessage(actionData);

	const { summary, banks, history } = loaderData;

	return (
		<>
			<PageHeader title="Payouts" description="Where we send what you earn from bookings, scouting and printing. We check every account with the bank first." />
			<div className="space-y-6">
				<div className="grid gap-3 sm:grid-cols-2">
					{(summary.totals.length ? summary.totals : [summary]).map((total) => (
						<Fragment key={total.currency}>
							<Total label="Owed to you" amount={total.owedMinor} currency={total.currency} hint="Released from bookings, not sent yet" />
							<Total label="Paid out" amount={total.paidMinor} currency={total.currency} hint="Sent to your bank accounts" />
						</Fragment>
					))}
				</div>
				{!summary.enabled && <Notice>Payouts start soon. Add your bank details now and what you're owed goes out once they do.</Notice>}

				<Section title="Your bank account" description="For your scout's cut and print jobs.">
					<AccountForm intent="own" account={summary.account} banks={banks} result={resultFor(actionData, "own")} />
				</Section>

				{summary.owners.map((owner) => (
					<Section key={owner.profileId} title={owner.name} description="Where this owner's share of each booking goes.">
						<AccountForm intent={`owner-${owner.profileId}`} profileId={owner.profileId} account={owner.account} banks={banks} result={resultFor(actionData, `owner-${owner.profileId}`)} />
					</Section>
				))}

				<Section title="Sent">
					{history.length ? (
						<ul className="divide-y divide-surface-200">
							{history.map((payout) => (
								<PayoutRow key={payout.id} payout={payout} />
							))}
						</ul>
					) : (
						<p className="text-sm text-ink-500">Nothing sent yet. Money is released once an advertiser accepts the photos of their ad, then sent a couple of days later.</p>
					)}
				</Section>
			</div>
		</>
	);
}

function Total({ label, amount, currency, hint }: { label: string; amount: number; currency: string; hint: string }) {
	return (
		<div className="panel p-5">
			<p className="text-sm text-ink-500">{label}</p>
			<p className="mt-1 font-display text-2xl font-extrabold text-ink-900 tabular-nums">{formatMoney(amount, currency)}</p>
			<p className="mt-1 text-xs text-ink-500">{hint}</p>
		</div>
	);
}

function AccountForm({ intent, profileId, account, banks, result }: { intent: string; profileId?: string; account: PayoutAccount | null; banks: Bank[]; result?: { error: string | null; fieldErrors: Record<string, string> } }) {
	const navigation = useNavigation();
	const busy = navigation.state !== "idle" && (navigation.formData?.get("profileId") ?? "") === (profileId ?? "");

	return (
		<div className="space-y-4">
			{account && (
				<div className="flex items-center gap-3 rounded-2xl bg-surface-100 px-4 py-3">
					<Landmark className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />
					<div className="min-w-0 flex-1 text-sm">
						<p className="font-semibold text-ink-900">{account.accountName}</p>
						<p className="text-ink-500 tabular-nums">
							{account.bankName} · {account.accountNumber}
						</p>
					</div>
					<BadgeCheck className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Checked with the bank" />
				</div>
			)}
			<Form method="post" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" key={account?.updatedAt ?? intent}>
				{profileId && <input type="hidden" name="profileId" value={profileId} />}
				<Field label="Bank" error={result?.fieldErrors?.bankCode}>
					<Select name="bankCode" required defaultValue={account?.bankCode ?? ""}>
						<option value="" disabled>
							Pick your bank
						</option>
						{banks.map((bank) => (
							<option key={bank.code} value={bank.code}>
								{bank.name}
							</option>
						))}
					</Select>
				</Field>
				<Field label="Account number" error={result?.fieldErrors?.accountNumber ?? result?.error ?? undefined}>
					<Input name="accountNumber" required inputMode="numeric" pattern="[0-9 ]{10,13}" maxLength={13} placeholder="0123456789" autoComplete="off" />
				</Field>
				<Button type="submit" disabled={busy} className="sm:mb-[1.375rem]">
					{busy ? <Spinner /> : <Wallet className="h-4 w-4" aria-hidden />}
					{account ? "Change" : "Save"}
				</Button>
			</Form>
		</div>
	);
}

function PayoutRow({ payout }: { payout: Payout }) {
	return (
		<li className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0 text-sm">
			<div className="min-w-0 flex-1">
				<p className="font-semibold text-ink-900">{STATUS[payout.status]}</p>
				<p className="text-ink-500">
					{payout.bankName} {payout.accountNumber} · {formatDay((payout.paidAt ?? payout.createdAt).slice(0, 10))}
				</p>
				{payout.failureReason && <p className="text-xs text-red-700">{payout.failureReason}</p>}
			</div>
			<span className="font-display text-base font-extrabold text-ink-900 tabular-nums">{formatMoney(payout.amountMinor, payout.currency)}</span>
		</li>
	);
}
