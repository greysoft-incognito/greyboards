import { Binoculars, type LucideIcon, Megaphone, PaintRoller, Presentation } from "lucide-react";
import type { AccountRole, AccountRoleKind, AccountRoleStatus, PartnerRequirement } from "@greyboards/types";

/** The Lucide icon for each marketplace role. */
export const ROLE_ICONS: Record<AccountRoleKind, LucideIcon> = {
	advertiser: Megaphone,
	owner: Presentation,
	scout: Binoculars,
	dispatch: PaintRoller,
};

const STATUS_LABELS: Record<AccountRoleStatus, string> = {
	active: "Active",
	pending: "Waiting for review",
	rejected: "Not approved",
	suspended: "Suspended",
};

const STATUS_STYLES: Record<AccountRoleStatus, string> = {
	active: "bg-emerald-50 text-available",
	pending: "bg-amber-50 text-held",
	rejected: "bg-red-50 text-red-700",
	suspended: "bg-surface-100 text-ink-700",
};

/** Where a role's review stands, as a small badge. A waiting application with something still to send waits on the account, not on us. */
export function RoleStatus({ status, missing = [] }: { status: AccountRoleStatus; missing?: PartnerRequirement[] }) {
	return (
		<span className={`inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[status]}`}>
			<span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
			{status === "pending" && missing.length ? "Waiting for your details" : STATUS_LABELS[status]}
		</span>
	);
}

/** What a role still waits on. Empty when the API doesn't say, such as before it is updated. */
export function stillNeeded(role: AccountRole): PartnerRequirement[] {
	return role.missing ?? [];
}

/** What the account still has to send, as part of a sentence, such as "your ID and bank account". */
export function missingWords(missing: PartnerRequirement[]) {
	if (missing.length > 1) return "your ID and bank account";

	return missing[0] === "identity" ? "your ID" : "your bank account";
}

/** The role the account holds of `kind`, if any. */
export function heldRole(roles: AccountRole[], kind: AccountRoleKind) {
	return roles.find((role) => role.kind === kind);
}
