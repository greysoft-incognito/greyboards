/** Every settings page, grouped the way the settings home and sidebar list them. */
export const SETTINGS_GROUPS = [
	{
		label: "Account",
		pages: [
			{ to: "/settings/profile", label: "Profile", hint: "Your name and photo" },
			{ to: "/settings/email", label: "Email", hint: "Your address and confirming it" },
			{ to: "/settings/roles", label: "How you use Greyboards", hint: "Advertise, own boards, scout or post bills" },
			{ to: "/settings/owners", label: "Board owners", hint: "Owners you manage, and claiming boards listed under your number" },
		],
	},
	{
		label: "Security",
		pages: [
			{ to: "/settings/password", label: "Password", hint: "Change the password you sign in with" },
			{ to: "/settings/two-step", label: "Two-step sign-in", hint: "A code from your phone after your password" },
			{ to: "/settings/devices", label: "Devices", hint: "Where you're signed in" },
		],
	},
	{
		label: "Leaving",
		pages: [{ to: "/settings/delete-account", label: "Delete account", hint: "Remove your account for good", danger: true }],
	},
] as const;

export type SettingsPageLink = (typeof SETTINGS_GROUPS)[number]["pages"][number];
