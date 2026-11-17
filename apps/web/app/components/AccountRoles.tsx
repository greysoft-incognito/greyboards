import { Binoculars, type LucideIcon, Megaphone, PaintRoller, Presentation } from "lucide-react";
import type { AccountRole, AccountRoleKind, AccountRoleStatus } from "@greyboards/types";

/** The Lucide icon for each marketplace role. */
export const ROLE_ICONS: Record<AccountRoleKind, LucideIcon> = {
	advertiser: Megaphone,
	owner: Presentation,
	scout: Binoculars,
	billposter: PaintRoller,
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

/** Where a role's review stands, as a small badge. */
export function RoleStatus({ status }: { status: AccountRoleStatus }) {
	return (
		<span className={`inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[status]}`}>
			<span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
			{STATUS_LABELS[status]}
		</span>
	);
}

/** The role the account holds of `kind`, if any. */
export function heldRole(roles: AccountRole[], kind: AccountRoleKind) {
	return roles.find((role) => role.kind === kind);
}
