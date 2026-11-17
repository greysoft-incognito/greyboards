import { Form, Link, useNavigation } from "react-router";
import { BadgeCheck, CircleAlert, IdCard, Landmark, Upload } from "lucide-react";
import type { IdentityDocumentDefinition, PartnerChecks } from "@greyboards/types";
import { Alert, Button, Field, Input, Select, Spinner } from "~/components/ui";
import { useLimits } from "~/lib/limits";

const ID_STATUS: Record<NonNullable<PartnerChecks["identity"]>["status"], string> = {
	submitted: "Waiting for a reviewer",
	verified: "Checked",
	rejected: "Turned down",
};

/**
 * What scouts and dispatchers send before a reviewer lets them in: a photo of a
 * government ID, and a bank account whose name matches it.
 */
export function PartnerChecksPanel({
	checks,
	documents,
	error,
	fieldErrors = {},
}: {
	checks: PartnerChecks;
	documents: IdentityDocumentDefinition[];
	error?: string | null;
	fieldErrors?: Record<string, string>;
}) {
	const navigation = useNavigation();
	const { maxImageMb } = useLimits();
	const busy = navigation.formData?.get("intent") === "send-id";
	const identity = checks.identity;
	const needsId = !identity || identity.status === "rejected";

	return (
		<section className="panel space-y-5 p-5 sm:p-6">
			<div>
				<h2 className="font-display text-xl font-bold text-ink-900">Checks for scouts and dispatchers</h2>
				<p className="mt-1 text-sm text-ink-500">You'll handle other people's boards and money, so we check who you are and where to pay you first.</p>
			</div>

			<div className="flex items-start gap-3">
				<IdCard className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
				<div className="min-w-0 flex-1 text-sm">
					<p className="font-semibold text-ink-900">Your ID</p>
					{identity ? (
						<p className="text-ink-700">
							{identity.documentLabel}, {identity.fullName}, {identity.documentNumber} · {ID_STATUS[identity.status]}
						</p>
					) : (
						<p className="text-ink-500">Not sent yet.</p>
					)}
					{identity?.status === "rejected" && identity.note && <p className="mt-1 text-red-700">Reviewer's note: {identity.note}</p>}
				</div>
				{identity?.status === "verified" && <BadgeCheck className="h-5 w-5 text-available" aria-label="Checked" />}
			</div>

			{(needsId || identity?.status === "submitted") && (
				<Form method="post" encType="multipart/form-data" className="space-y-4 rounded-2xl bg-surface-100 p-4">
					<input type="hidden" name="intent" value="send-id" />
					<div className="grid gap-4 sm:grid-cols-2">
						<Field label="Kind of ID" error={fieldErrors.documentType}>
							<Select name="documentType" defaultValue={identity?.documentType ?? documents[0]?.type} required>
								{documents.map((document) => (
									<option key={document.type} value={document.type}>
										{document.label}
									</option>
								))}
							</Select>
						</Field>
						<Field label="ID number" error={fieldErrors.documentNumber}>
							<Input name="documentNumber" required minLength={5} maxLength={30} autoComplete="off" />
						</Field>
					</div>
					<Field label="Your name as it is on the ID" error={fieldErrors.fullName}>
						<Input name="fullName" required minLength={3} maxLength={120} defaultValue={identity?.fullName ?? ""} />
					</Field>
					<Field label="Photo of the ID" error={fieldErrors.photo} hint={`Every corner in view and easy to read. Up to ${maxImageMb} MB.`}>
						<Input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required />
					</Field>
					{error && <Alert>{error}</Alert>}
					<Button type="submit" variant={identity ? "secondary" : "primary"} disabled={busy}>
						{busy ? <Spinner /> : <Upload className="h-4 w-4" aria-hidden />}
						{identity ? "Send a new photo" : "Send for checking"}
					</Button>
				</Form>
			)}

			<div className="flex items-start gap-3 border-t border-surface-200 pt-5">
				<Landmark className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
				<div className="min-w-0 flex-1 text-sm">
					<p className="font-semibold text-ink-900">Your bank account</p>
					{checks.bank ? (
						<p className="text-ink-700">
							{checks.bank.accountName}, {checks.bank.bankName} {checks.bank.maskedNumber}
						</p>
					) : (
						<p className="text-ink-500">
							Not added yet.{" "}
							<Link prefetch="intent" to="/settings/payouts" className="font-semibold text-brand-700 hover:underline">
								Add it under Payouts
							</Link>
						</p>
					)}
					{checks.namesMatch === false && (
						<p className="mt-1 flex items-center gap-1.5 text-held">
							<CircleAlert className="h-4 w-4" aria-hidden />
							The bank's name for this account doesn't match your ID. A reviewer may ask about it.
						</p>
					)}
				</div>
			</div>
		</section>
	);
}
