import type { Permission, UserRole } from "@greyboards/types";
import { formError, type ServerApi } from "./api.server";
import type { RouterContextProvider } from "react-router";
import { requireUser } from "./session.server";

/**
 * The signed-in user, when their role holds any of `permissions` (or any permission
 * at all when none are given). Everyone else gets a 404, so the dashboard stays out of sight.
 */
export async function requireAdmin(request: Request, context: Readonly<RouterContextProvider>, ...permissions: Permission[]) {
	const session = await requireUser(request, context);
	const granted = session.user.permissions;
	const allowed = permissions.length ? permissions.some((permission) => granted.includes(permission)) : granted.length > 0;

	if (!allowed) throw new Response("Not found", { status: 404 });

	return session;
}

/** Saves a verification or a score correction posted by `RoleReputationControls`. */
export async function updateReputation(api: ServerApi, form: FormData) {
	const id = String(form.get("roleId"));
	const intent = form.get("intent");

	try {
		if (intent === "verify") await api.admin.verifyAccountRole(id, { note: String(form.get("note") ?? "") || null });
		if (intent === "unverify") await api.admin.unverifyAccountRole(id);
		if (intent === "adjust") await api.admin.adjustReputation(id, { points: Number(form.get("points")), note: String(form.get("note") ?? "") });

		return { error: null };
	} catch (error) {
		return { error: formError(error).error };
	}
}

/** Saves a role change or a suspension posted by `AccountControls`. */
export async function updateAccount(api: ServerApi, form: FormData) {
	const id = String(form.get("id"));

	try {
		if (form.get("intent") === "role") await api.admin.updateUser(id, { role: String(form.get("role")) as UserRole });
		if (form.get("intent") === "suspend") await api.admin.updateUser(id, { suspended: form.get("suspended") === "true" });

		return { error: null };
	} catch (error) {
		return { error: formError(error).error };
	}
}
