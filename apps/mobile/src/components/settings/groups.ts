import type { Href } from 'expo-router'

/** Every settings screen, grouped the way the account tab lists them. Mirrors the web's settings nav. */
export const SETTINGS_GROUPS: { label: string; pages: { to: Href; label: string; hint: string; danger?: boolean }[] }[] = [
  {
    label: 'Account',
    pages: [
      { to: '/settings/profile', label: 'Profile', hint: 'Your name and photo' },
      { to: '/settings/email', label: 'Email', hint: 'Your address and confirming it' },
      { to: '/settings/roles', label: 'Roles', hint: 'Advertiser, owner, scout or billposter' },
    ],
  },
  {
    label: 'Security',
    pages: [
      { to: '/settings/password', label: 'Password', hint: 'Change the password you sign in with' },
      { to: '/settings/two-step', label: 'Two-step sign-in', hint: 'A code from your phone after your password' },
      { to: '/settings/devices', label: 'Devices', hint: "Where you're signed in" },
    ],
  },
  {
    label: 'Privacy',
    pages: [{ to: '/settings/delete-account', label: 'Delete account', hint: 'Remove your account for good', danger: true }],
  },
]
