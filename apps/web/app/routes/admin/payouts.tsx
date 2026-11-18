import { Form, Link, useNavigation } from "react-router";
import { RotateCw } from "lucide-react";
import type { PayoutStatus } from "@greyboards/types";
import { AdminHeader } from "~/components/admin/AdminHeader";
import { formatDay, formatMoney } from "~/components/bookings/BookingBits";
import { Pager } from "~/components/Pager";
import { Alert, Button, Select, Spinner } from "~/components/ui";
import { requireAdmin } from "~/lib/admin.server";
import { formError } from "~/lib/api.server";
import { useToastMessage } from "~/lib/toast";
import type { Route } from "./+types/payouts";

export const meta = () => [{ title: "Payouts · Admin · Greyboards" }];

const STATUSES: { value: PayoutStatus; label: string }[] = [
	{ value: "failed", label: "Failed" },
	{ value: "processing", label: "On the way" },
	{ value: "paid", label: "Paid" },
];

const WHO = { owner: "Owner", scout: "Scout", dispatch: "Dispatch" } as const;

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireAdmin(request, context, "payouts.manage");
	const params = new URL(request.url).searchParams;
	const status = STATUSES.find((entry) => entry.value === params.get("status"))?.value;
	const result = await api.admin.payouts({ status, page: Number(params.get("page")) || 1 });

	return { payouts: result.data, meta: result.meta, status: status ?? "" };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireAdmin(request, context, "payouts.manage");
	const form = await request.formData();

	try {
		const { data } = await api.admin.retryPayout(String(form.get("id")));

		return { error: data.status === "failed" ? data.failureReason ?? "It failed again." : null, message: data.status === "failed" ? null : "Sent again." };
	} catch (error) {
		return { error: formError(error).error, message: null };
	}
}

/** Every transfer to owners, scouts and dispatchers, with failed ones to send again. */
export default function AdminPayouts({ loaderData, actionData }: Route.ComponentProps) {
	useToastMessage(actionData);

	const { payouts, meta, status } = loaderData;
	const navigation = useNavigation();
	const retrying = navigation.formData?.get("id");

	return (
		<>
			<AdminHeader title="Payouts" description="Payments to owners, scouts and dispatchers. Failed transfers wait here to be retried." />
			<div className="space-y-6 px-4 py-8 sm:px-8">
				<Form method="get" className="flex flex-wrap items-center gap-3">
					<Select name="status" defaultValue={status} aria-label="Status" className="w-auto">
						<option value="">Every payout</option>
						{STATUSES.map((entry) => (
							<option key={entry.value} value={entry.value}>
								{entry.label}
							</option>
						))}
					</Select>
					<Button type="submit" variant="secondary">
						Show
					</Button>
				</Form>
				{actionData?.error && <Alert>{actionData.error}</Alert>}

				{payouts.length ? (
					<div className="panel overflow-x-auto">
						<table className="w-full min-w-[760px] text-left text-sm">
							<thead className="text-xs font-semibold text-ink-500">
								<tr className="border-b border-surface-200">
									<th className="px-4 py-3">To</th>
									<th className="px-4 py-3">Account</th>
									<th className="px-4 py-3">Booking</th>
									<th className="px-4 py-3">Status</th>
									<th className="px-4 py-3 text-right">Amount</th>
									<th className="px-4 py-3" />
								</tr>
							</thead>
							<tbody>
								{payouts.map((payout) => (
									<tr key={payout.id} className="border-b border-surface-100 last:border-0">
										<td className="px-4 py-3">
											<span className="font-semibold text-ink-900">{payout.accountName}</span>
											<span className="block text-xs text-ink-500">{WHO[payout.account]}</span>
										</td>
										<td className="px-4 py-3 text-ink-700 tabular-nums">
											{payout.bankName} {payout.accountNumber}
										</td>
										<td className="px-4 py-3">
											<Link to={`/bookings/${payout.bookingId}`} className="text-brand-700 hover:underline">
												{formatDay(payout.createdAt.slice(0, 10))}
											</Link>
										</td>
										<td className="px-4 py-3 text-ink-700">
											{STATUSES.find((entry) => entry.value === payout.status)?.label}
											{payout.failureReason && <span className="block text-xs text-red-700">{payout.failureReason}</span>}
										</td>
										<td className="px-4 py-3 text-right font-semibold text-ink-900 tabular-nums">{formatMoney(payout.amountMinor, payout.currency)}</td>
										<td className="px-4 py-3 text-right">
											{payout.status === "failed" && (
												<Form method="post">
													<input type="hidden" name="id" value={payout.id} />
													<Button type="submit" variant="secondary" disabled={!!retrying} className="!py-2">
														{retrying === payout.id ? <Spinner /> : <RotateCw className="h-4 w-4" aria-hidden />}
														Retry
													</Button>
												</Form>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<p className="panel px-5 py-10 text-center text-sm text-ink-500">No payouts here.</p>
				)}

				<Pager meta={meta} noun="payouts" />
			</div>
		</>
	);
}
