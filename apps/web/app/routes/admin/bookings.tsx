import { Form, Link } from "react-router";
import type { BookingStatus } from "@greyboards/types";
import { AdminHeader } from "~/components/admin/AdminHeader";
import { BookingStatusBadge, formatDays, formatMoney } from "~/components/bookings/BookingBits";
import { Pager } from "~/components/Pager";
import { Button, Select } from "~/components/ui";
import { requireAdmin } from "~/lib/admin.server";
import type { Route } from "./+types/bookings";

export const meta = () => [{ title: "Bookings · Admin · Greyboards" }];

const STATUSES: { value: BookingStatus; label: string }[] = [
	{ value: "paid", label: "Paid" },
	{ value: "held", label: "Waiting for payment" },
	{ value: "live", label: "Up on the board" },
	{ value: "completed", label: "Finished" },
	{ value: "cancelled", label: "Cancelled" },
	{ value: "expired", label: "Expired" },
];

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireAdmin(request, context, "bookings.view");
	const params = new URL(request.url).searchParams;
	const status = STATUSES.find((entry) => entry.value === params.get("status"))?.value;
	const result = await api.admin.bookings({ status, page: Number(params.get("page")) || 1 });

	return { bookings: result.data, meta: result.meta, status: status ?? "" };
}

/** Every booking with what was paid and how it will be shared once the ad is up. */
export default function AdminBookings({ loaderData }: Route.ComponentProps) {
	const { bookings, meta, status } = loaderData;

	return (
		<>
			<AdminHeader title="Bookings" description="Every payment, what's being held and how it'll be split." />
			<div className="space-y-6 px-4 py-8 sm:px-8">
				<Form method="get" className="flex flex-wrap items-center gap-3">
					<Select name="status" defaultValue={status} aria-label="Status" className="w-auto">
						<option value="">Every booking</option>
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

				{bookings.length ? (
					<div className="panel overflow-x-auto">
						<table className="w-full min-w-[720px] text-left text-sm">
							<thead className="text-xs font-semibold text-ink-500">
								<tr className="border-b border-surface-200">
									<th className="px-4 py-3">Board</th>
									<th className="px-4 py-3">Days</th>
									<th className="px-4 py-3">Status</th>
									<th className="px-4 py-3 text-right">Paid</th>
									<th className="px-4 py-3 text-right">Owner</th>
									<th className="px-4 py-3 text-right">Scout</th>
									<th className="px-4 py-3 text-right">Greyboards</th>
								</tr>
							</thead>
							<tbody>
								{bookings.map((booking) => (
									<tr key={booking.id} className="border-b border-surface-100 last:border-0">
										<td className="px-4 py-3 font-semibold text-ink-900">
											<Link to={`/bookings/${booking.id}`} className="hover:text-brand-700">
												{booking.board?.name ?? "Board"}
											</Link>
										</td>
										<td className="px-4 py-3 text-ink-700">{formatDays(booking)}</td>
										<td className="px-4 py-3">
											<BookingStatusBadge status={booking.status} />
										</td>
										<td className="px-4 py-3 text-right text-ink-900 tabular-nums">{formatMoney(booking.amountMinor, booking.currency)}</td>
										{(["ownerAmountMinor", "scoutAmountMinor", "platformAmountMinor"] as const).map((key) => (
											<td key={key} className="px-4 py-3 text-right text-ink-700 tabular-nums">
												{booking.split && booking.split[key] ? formatMoney(booking.split[key], booking.currency) : "–"}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<p className="panel px-5 py-10 text-center text-sm text-ink-500">No bookings here.</p>
				)}

				<Pager meta={meta} noun="bookings" />
			</div>
		</>
	);
}
