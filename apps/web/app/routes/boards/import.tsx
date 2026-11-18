import { Form, Link, redirect, useNavigation } from "react-router";
import { ArrowLeft, CircleAlert, CircleCheck, Download, FileSpreadsheet, TriangleAlert, Upload } from "lucide-react";
import type { BoardImportResult } from "@greyboards/types";
import { ManagedOwnerSelect } from "~/components/boards/OwnerPicker";
import { Alert, Button, Spinner } from "~/components/ui";
import { formError } from "~/lib/api.server";
import { requireUser } from "~/lib/session.server";
import type { Route } from "./+types/import";

export const meta = () => [{ title: "Import boards · Greyboards" }];

/** The template's heading row and an example, matching what the import reads. */
const TEMPLATE = [
	"name,kind,width_m,height_m,latitude,longitude,rate,period,faces,lit,address,city,facing,description",
	'"Ahmadu Bello Way, by Murtala Square",billboard,12,4,10.5222,7.4383,850000,month,2,yes,Ahmadu Bello Way,Kaduna,Traffic to the centre,Clear view from both lanes',
].join("\r\n");

export async function loader({ request, context }: Route.LoaderArgs) {
	const { api, user } = await requireUser(request, context);

	if (!user.accountRoles.some((role) => role.kind === "owner" && role.status === "active")) throw redirect("/settings/roles");

	const profiles = await api.account.ownerProfiles({ per_page: 100 }).catch(() => null);

	return { ownerProfiles: profiles?.data ?? [] };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { api } = await requireUser(request, context);
	const form = await request.formData();
	const file = form.get("file");
	const csv = file instanceof File && file.size > 0 ? await file.text() : String(form.get("csv") ?? "");
	const dryRun = form.get("intent") !== "import";
	const ownerProfileId = form.get("ownerProfileId") ? String(form.get("ownerProfileId")) : null;

	if (!csv.trim()) return { error: "Pick the CSV file to import.", result: null, csv: "", ownerProfileId };

	try {
		const { data } = await api.account.importBoards({ csv, dryRun, ownerProfileId });

		if (!dryRun) throw redirect(`/boards?status=pending&imported=${data.imported}`);

		return { error: null, result: data, csv, ownerProfileId };
	} catch (error) {
		if (error instanceof Response) throw error;

		return { error: formError(error).error, result: null as BoardImportResult | null, csv, ownerProfileId };
	}
}

/** Owners with many boards add them from a spreadsheet: check the file, fix what's wrong, then import. */
export default function ImportBoards({ loaderData, actionData }: Route.ComponentProps) {
	const navigation = useNavigation();
	const busy = (intent: string) => navigation.state !== "idle" && navigation.formData?.get("intent") === intent;
	const result = actionData?.result ?? null;

	return (
		<main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
			<Link prefetch="intent" to="/boards" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
				<ArrowLeft className="h-4 w-4" aria-hidden />
				My boards
			</Link>
			<h1 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.03em] text-ink-900 sm:text-4xl">Import boards</h1>
			<p className="mt-1 mb-6 text-ink-500">Add many boards at once from a spreadsheet. We check each row first, and every board is reviewed before it goes on the map.</p>

			<div className="space-y-6">
				<section className="panel space-y-4 p-5 sm:p-6">
					<h2 className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-ink-900">
						<FileSpreadsheet className="h-5 w-5 text-brand-600" aria-hidden />
						1. Fill in the template
					</h2>
					<p className="text-sm text-ink-700">
						One board per row. Name, kind, width, height, latitude and longitude are needed; the rest can be blank. Rates are per week or month, in the currency of the board’s country unless you add a currency column. Save the sheet as CSV.
					</p>
					<a href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`} download="greyboards-boards.csv" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline">
						<Download className="h-4 w-4" aria-hidden />
						Download the template
					</a>
				</section>

				<section className="panel space-y-4 p-5 sm:p-6">
					<h2 className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-ink-900">
						<Upload className="h-5 w-5 text-brand-600" aria-hidden />
						2. Check the file
					</h2>
					<Form method="post" encType="multipart/form-data" className="space-y-4">
						<input type="hidden" name="intent" value="check" />
						<input
							type="file"
							name="file"
							accept=".csv,text/csv"
							required
							className="block w-full rounded-2xl border-[1.5px] border-dashed border-surface-300 bg-white px-4 py-4 text-sm text-ink-700 file:mr-3 file:rounded-full file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:font-semibold file:text-brand-700"
						/>
						<ManagedOwnerSelect profiles={loaderData.ownerProfiles} />
						{actionData?.error && <Alert>{actionData.error}</Alert>}
						<Button type="submit" variant="secondary" disabled={busy("check")}>
							{busy("check") ? <Spinner /> : <CircleCheck className="h-4 w-4" aria-hidden />}
							Check the rows
						</Button>
					</Form>
				</section>

				{result && (
					<section className="panel space-y-4 p-5 sm:p-6">
						<h2 className="font-display text-lg font-extrabold tracking-tight text-ink-900">3. Import</h2>
						<p className="text-sm text-ink-700">
							<strong>{result.ok}</strong> of {result.total} rows are ready.{result.failed > 0 && " Rows with problems are skipped; fix them in the sheet and import them later."}
						</p>
						<ul className="divide-y divide-surface-200 rounded-2xl border border-surface-200 text-sm">
							{result.rows.map((row) => (
								<li key={row.line} className="flex items-start gap-3 px-4 py-3">
									{row.ok ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-available" aria-hidden /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden />}
									<div className="min-w-0">
										<p className="font-semibold text-ink-900">
											<span className="mr-2 font-normal text-ink-500 tabular-nums">Row {row.line}</span>
											{row.name || "No name"}
										</p>
										{row.errors.length > 0 && <p className="text-red-700">{row.errors.join(" ")}</p>}
										{row.duplicates > 0 && (
											<p className="flex items-center gap-1.5 text-ink-500">
												<TriangleAlert className="h-3.5 w-3.5 text-held" aria-hidden />
												{row.duplicates === 1 ? "A board is already tagged here." : `${row.duplicates} boards are already tagged here.`} Reviewers will compare them.
											</p>
										)}
									</div>
								</li>
							))}
						</ul>
						{result.ok > 0 && (
							<Form method="post">
								<input type="hidden" name="intent" value="import" />
								<input type="hidden" name="csv" value={actionData?.csv ?? ""} />
								{actionData?.ownerProfileId && <input type="hidden" name="ownerProfileId" value={actionData.ownerProfileId} />}
								<Button type="submit" disabled={busy("import")}>
									{busy("import") ? <Spinner /> : <Upload className="h-4 w-4" aria-hidden />}
									Import {result.ok} {result.ok === 1 ? "board" : "boards"}
								</Button>
							</Form>
						)}
					</section>
				)}
			</div>
		</main>
	);
}
