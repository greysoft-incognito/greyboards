export type PermissionName = 'dashboard.view' | 'users.view' | 'users.manage' | 'partners.review' | 'boards.review' | 'bookings.view' | 'payouts.manage' | 'disputes.resolve' | 'reputation.manage' | 'settings.manage' | 'roles.manage' | 'pages.manage'

export interface PermissionDefinition {
  name: PermissionName
  label: string
  description: string
}

/**
 * Everything a role can be allowed to do in the admin dashboard. Roles are collections
 * of these; the code checks them by name, so new ones are added here.
 */
export class Permission {
  static readonly ALL: PermissionDefinition[] = [
    { name: 'dashboard.view', label: 'Open the dashboard', description: 'See the admin dashboard and its overview.' },
    { name: 'users.view', label: 'See accounts', description: 'Search accounts and see what they hold.' },
    { name: 'users.manage', label: 'Manage accounts', description: 'Give accounts a role, suspend them and let them back in.' },
    { name: 'partners.review', label: 'Review scouts and dispatchers', description: 'Approve, reject or suspend people who apply to scout or print and post.' },
    { name: 'boards.review', label: 'Review boards', description: 'Check boards scouts and owners tag, then list, reject or unlist them.' },
    { name: 'bookings.view', label: 'See bookings', description: 'See every booking, what was paid and where the money sits.' },
    { name: 'payouts.manage', label: 'Manage payouts and refunds', description: 'See every payout to owners, scouts and dispatchers, send failed ones again, and refund paid bookings.' },
    { name: 'disputes.resolve', label: 'Decide disputes', description: 'Look into disputes about bookings and decide them: refund, pay the board’s side, or close without a change.' },
    { name: 'reputation.manage', label: 'Verify accounts', description: 'Give or take away the staff-verified badge on a role, and correct a role’s reputation score with a note.' },
    { name: 'settings.manage', label: 'Change settings', description: 'Change upload limits and other app settings.' },
    { name: 'roles.manage', label: 'Manage roles', description: 'Create roles and choose what each one allows.' },
    { name: 'pages.manage', label: 'Manage pages', description: 'Write the privacy policy, terms, about page and any other pages.' },
  ]

  static names(): PermissionName[] {
    return Permission.ALL.map((permission) => permission.name)
  }
}
