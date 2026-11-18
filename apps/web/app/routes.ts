import { type RouteConfig, index, layout, prefix, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("signin", "routes/signin.tsx"),
	route("signup", "routes/signup.tsx"),
	route("signout", "routes/signout.tsx"),
	route("forgot-password", "routes/forgot-password.tsx"),
	route("reset-password", "routes/reset-password.tsx"),
	route("verify-email", "routes/verify-email.tsx"),

	// The board map, open to everyone.
	route("map", "routes/map/index.tsx"),
	route("map/data", "routes/map/data.ts"),

	// Signed-in area with the app header.
	layout("routes/app-layout.tsx", [
		route("dashboard", "routes/dashboard.tsx"),
		route("boards", "routes/boards/index.tsx"),
		route("boards/new", "routes/boards/new.tsx"),
		route("boards/owners", "routes/boards/owners.ts"),
		route("boards/nearby", "routes/boards/nearby.ts"),
		route("boards/price-guide", "routes/boards/price-guide.ts"),
		route("boards/:id", "routes/boards/board.tsx"),
		route("boards/:id/edit", "routes/boards/edit.tsx"),
		route("bookings", "routes/bookings/index.tsx"),
		route("bookings/:id", "routes/bookings/booking.tsx"),
		route("shares", "routes/shares/open.tsx"),
		route("shares/:token", "routes/shares/invite.tsx"),
		route("reports", "routes/reports/index.tsx"),
		route("pipeline", "routes/pipeline/index.tsx"),
		route("jobs", "routes/jobs/index.tsx"),
		route("jobs/prices", "routes/jobs/prices.tsx"),
		route("jobs/:id", "routes/jobs/job.tsx"),
		route("checkout/complete", "routes/checkout-complete.tsx"),
		route("settings", "routes/settings/layout.tsx", [
			index("routes/settings/index.tsx"),
			route("profile", "routes/settings/profile.tsx"),
			route("email", "routes/settings/email.tsx"),
			route("roles", "routes/settings/roles.tsx"),
			route("owners", "routes/settings/owners.tsx"),
			route("payouts", "routes/settings/payouts.tsx"),
			route("password", "routes/settings/password.tsx"),
			route("two-step", "routes/settings/two-step.tsx"),
			route("devices", "routes/settings/devices.tsx"),
			route("api-keys", "routes/settings/api-keys.tsx"),
			route("delete-account", "routes/settings/delete-account.tsx"),
		]),
	]),

	// Admin dashboard. Each page needs a role that grants it.
	...prefix("admin", [
		layout("routes/admin/layout.tsx", [
			index("routes/admin/overview.tsx"),
			route("users", "routes/admin/users.tsx"),
			route("users/:id", "routes/admin/user.tsx"),
			route("applications", "routes/admin/applications.tsx"),
			route("boards", "routes/admin/boards.tsx"),
			route("bookings", "routes/admin/bookings.tsx"),
			route("payouts", "routes/admin/payouts.tsx"),
			route("disputes", "routes/admin/disputes.tsx"),
			route("territories", "routes/admin/territories.tsx"),
			route("pages/:document?", "routes/admin/pages.tsx"),
			route("roles/:role?", "routes/admin/roles.tsx"),
			route("configuration/:group?", "routes/admin/configuration.tsx"),
		]),
	]),

	// Public pages under the site header and footer.
	layout("routes/site-layout.tsx", [
		route("pages/:slug", "routes/document.tsx"),
		route("agreements/:token", "routes/agreement.tsx"),
		route("reports/:token", "routes/reports/shared.tsx"),
		...(["privacy", "terms", "about"] as const).map((slug) => route(slug, "routes/document.tsx", { id: `document-${slug}` })),
	]),
] satisfies RouteConfig;
