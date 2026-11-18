import type { Href } from 'expo-router'

/** Every settings screen, grouped the way the account tab lists them. Mirrors the web's settings nav. */
export const SETTINGS_GROUPS: { label: string; pages: { to: Href; label: string; hint: string; danger?: boolean }[] }[] = [
  {
    label: 'Account',
    pages: [
      { to: '/settings/profile', label: 'Profile', hint: 'Your name and photo' },
      { to: '/settings/email', label: 'Email', hint: 'Change or confirm your email' },
      { to: '/settings/roles', label: 'Roles', hint: 'Advertiser, owner, scout or dispatcher' },
      { to: '/settings/owners', label: 'Board owners', hint: 'Owners you manage' },
      { to: '/settings/payouts', label: 'Payouts', hint: 'Bank details, and what you’ve earned and been sent' },
    ],
  },
  {
    label: 'Security',
    pages: [
      { to: '/settings/password', label: 'Password', hint: 'Change your password' },
      { to: '/settings/two-step', label: 'Two-step sign-in', hint: 'Extra security when you sign in' },
      { to: '/settings/devices', label: 'Devices', hint: "Where you're signed in" },
    ],
  },
  {
    label: 'Privacy',
    pages: [{ to: '/settings/delete-account', label: 'Delete account', hint: 'Delete your account', danger: true }],
  },
]
