import { Form, Link, useNavigation } from "react-router";
import { Globe2, Pencil, Plus, Trash2 } from "lucide-react";
import { currencyOptions, type PaymentRegion } from "@greyboards/types";
import { AdminHeader } from "~/components/admin/AdminHeader";
import { Pager } from "~/components/Pager";
import { Alert, Button, Field, Input, Select, Spinner } from "~/components/ui";
import { requireAdmin } from "~/lib/admin.server";
import { formError } from "~/lib/api.server";
import { useToastMessage } from "~/lib/toast";
import type { Route } from "./+types/payment-regions";

export const meta = () => [{ title: "Payment regions · Admin · Greyboards" }];

const CURRENCIES = currencyOptions();

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api } = await requireAdmin(request, context, "settings.manage");
	const params = new URL(request.url).searchParams;
	const result = await api.admin.paymentRegions({ page: Number(params.get("page")) || 1 });
	const editing = result.data.find((region) => region.id === params.get("edit")) ?? null;

	return { regions: result.data, meta: result.meta, providers: result.providers, editing };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireAdmin(request, context, "settings.manage");
	const form = await request.formData();
	const id = String(form.get("id") ?? "");

	try {
		if (form.get("intent") === "remove") {
			await api.admin.removePaymentRegion(id);

			return { error: null, message: "Region removed.", fieldErrors: {} as Record<string, string> };
		}

		const region = {
			name: String(form.get("name") ?? ""),
			countries: String(form.get("countries") ?? "")
				.split(/[\s,]+/)
				.map((code) => code.trim().toUpperCase())
				.filter(Boolean),
			currency: String(form.get("currency") ?? ""),
			provider: String(form.get("provider") ?? "") || null,
			exchangeRate: Number(form.get("exchangeRate")) || null,
			rateMarkup: Number(form.get("rateMarkup")) || 0,
			active: form.get("active") === "on",
		};

		if (id) await api.admin.updatePaymentRegion(id, region);
		else await api.admin.createPaymentRegion(region);

		return { error: null, message: id ? "Region saved." : "Region added.", fieldErrors: {} as Record<string, string> };
	} catch (error) {
		const { error: message, fieldErrors } = formError(error);

		return { error: message, message: null, fieldErrors };
	}
}

const countryName = (code: string) => {
	try {
		return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
	} catch {
		return code;
	}
};

/** Countries that price and pay in their own currency. Everywhere else uses the default currency in Configuration. */
export default function AdminPaymentRegions({ loaderData, actionData }: Route.ComponentProps) {
	useToastMessage(actionData);

	const { regions, meta, providers, editing } = loaderData;
	const navigation = useNavigation();
	const saving = navigation.formData?.get("intent") === "save";
	const removing = navigation.formData?.get("intent") === "remove" ? navigation.formData.get("id") : null;
	const errors = actionData?.fieldErrors ?? {};
	const providerName = (key: string | null) => (key ? (providers.find((provider) => provider.value === key)?.label ?? key) : "Default provider");

	return (
		<>
			<AdminHeader
				title="Payment regions"
				description="Countries that price boards and pay in their own currency. Boards and payers anywhere else use the default currency from Configuration."
			/>
			<div className="grid gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[1fr_24rem]">
				<section className="space-y-3">
					{regions.length ? (
						<ul className="panel divide-y divide-surface-100">
							{regions.map((region) => (
								<RegionRow key={region.id} region={region} provider={providerName(region.provider)} removing={removing === region.id} />
							))}
						</ul>
					) : (
						<p className="panel px-5 py-10 text-center text-sm text-ink-500">No regions yet, so every board and payer uses the default currency.</p>
					)}
					<Pager meta={meta} noun="regions" />
				</section>

				<section className="panel h-fit space-y-3 p-5">
					<div className="flex items-center justify-between gap-3">
						<h2 className="font-display text-lg font-extrabold tracking-tight text-ink-900">{editing ? `Edit ${editing.name}` : "Add a region"}</h2>
						{editing && (
							<Link to="/admin/payment-regions" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
								Cancel
							</Link>
						)}
					</div>
					{actionData?.error && <Alert>{actionData.error}</Alert>}
					<Form method="post" className="space-y-3" key={editing?.id ?? "new"}>
						<input type="hidden" name="intent" value="save" />
						<input type="hidden" name="id" value={editing?.id ?? ""} />
						<Field label="Name" error={errors.name}>
							<Input name="name" required maxLength={80} defaultValue={editing?.name} placeholder="Such as: Ghana" />
						</Field>
						<Field label="Countries" error={errors.countries} hint="Two-letter codes, separated by commas.">
							<Input name="countries" required defaultValue={editing?.countries.join(", ")} placeholder="GH" />
						</Field>
						<Field label="Currency" error={errors.currency}>
							<Select name="currency" required defaultValue={editing?.currency ?? ""}>
								<option value="" disabled>
									Pick a currency
								</option>
								{CURRENCIES.map((currency) => (
									<option key={currency.value} value={currency.value}>
										{currency.label}
									</option>
								))}
							</Select>
						</Field>
						<Field label="Payment provider" error={errors.provider}>
							<Select name="provider" defaultValue={editing?.provider ?? ""}>
								<option value="">Default provider</option>
								{providers.map((provider) => (
									<option key={provider.value} value={provider.value}>
										{provider.label}
									</option>
								))}
							</Select>
						</Field>
						<div className="grid grid-cols-2 gap-3">
							<Field label="Fixed rate" error={errors.exchangeRate} hint="What one unit of the default currency is worth here. Empty uses the live rate.">
								<Input name="exchangeRate" type="number" min="0" step="any" defaultValue={editing?.exchangeRate ?? ""} />
							</Field>
							<Field label="Markup" error={errors.rateMarkup} hint="Percent added to the live rate.">
								<Input name="rateMarkup" type="number" min="0" max="100" step="0.01" defaultValue={editing?.rateMarkup ?? 0} />
							</Field>
						</div>
						<label className="panel flex cursor-pointer items-start gap-3 p-4 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
							<input type="checkbox" name="active" defaultChecked={editing?.active ?? true} className="mt-1 h-4 w-4 accent-brand-600" />
							<span>
								<span className="block text-sm font-semibold text-ink-900">On</span>
								<span className="block text-sm text-ink-500">When off, these countries use the default currency.</span>
							</span>
						</label>
						<Button type="submit" className="w-full" disabled={saving}>
							{saving ? <Spinner /> : editing ? <Pencil className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
							{editing ? "Save region" : "Add region"}
						</Button>
					</Form>
				</section>
			</div>
		</>
	);
}

function RegionRow({ region, provider, removing }: { region: PaymentRegion; provider: string; removing: boolean }) {
	return (
		<li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
			<div className="flex min-w-0 items-start gap-3">
				<Globe2 className="mt-0.5 h-5 w-5 text-brand-700" aria-hidden />
				<div className="min-w-0">
					<p className="flex items-center gap-2 font-semibold text-ink-900">
						{region.name}
						{!region.active && <span className="rounded-md bg-surface-200 px-1.5 py-0.5 text-xs font-semibold text-ink-700">Off</span>}
					</p>
					<p className="text-sm text-ink-700">
						{region.currency} · {provider} · {region.exchangeRate ? `fixed at ${region.exchangeRate}` : region.rateMarkup ? `live rate + ${region.rateMarkup}%` : "live rate"}
					</p>
					<p className="truncate text-sm text-ink-500">{region.countries.map(countryName).join(", ")}</p>
				</div>
			</div>
			<div className="flex items-center gap-1">
				<Link to={`/admin/payment-regions?edit=${region.id}`} className="rounded-lg p-2 text-ink-700 hover:bg-surface-100" aria-label={`Edit ${region.name}`}>
					<Pencil className="h-4 w-4" aria-hidden />
				</Link>
				<Form method="post">
					<input type="hidden" name="id" value={region.id} />
					<Button
						type="submit"
						name="intent"
						value="remove"
						variant="ghost"
						className="!py-2 text-red-700"
						disabled={removing}
						aria-label={`Remove ${region.name}`}
						confirm={{ title: `Remove ${region.name}?`, message: "Its countries go back to the default currency and provider.", action: "Remove", danger: true }}
					>
						{removing ? <Spinner /> : <Trash2 className="h-4 w-4" aria-hidden />}
					</Button>
				</Form>
			</div>
		</li>
	);
}
