/** Every settings page, grouped the way the settings home and sidebar list them. */
export const SETTINGS_GROUPS = [
	{
		label: "Account",
		pages: [
			{ to: "/settings/profile", label: "Profile", hint: "Your name and photo" },
			{ to: "/settings/email", label: "Email", hint: "Change or confirm your email" },
			{ to: "/settings/roles", label: "How you use Greyboards", hint: "Advertise, own boards, scout or post bills" },
			{ to: "/settings/owners", label: "Board owners", hint: "Owners you manage and boards listed under your number" },
			{ to: "/settings/payouts", label: "Payouts", hint: "Bank details and earnings" },
		],
	},
	{
		label: "Security",
		pages: [
			{ to: "/settings/password", label: "Password", hint: "Change your password" },
			{ to: "/settings/two-step", label: "Two-step sign-in", hint: "A code from your phone after your password" },
			{ to: "/settings/devices", label: "Devices", hint: "Where you're signed in" },
			{ to: "/settings/api-keys", label: "API keys", hint: "Connect your own tools to search and book boards" },
		],
	},
	{
		label: "Leaving",
		pages: [{ to: "/settings/delete-account", label: "Delete account", hint: "Delete your account", danger: true }],
	},
] as const;

export type SettingsPageLink = (typeof SETTINGS_GROUPS)[number]["pages"][number];
