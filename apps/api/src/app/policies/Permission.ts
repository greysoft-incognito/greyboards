export type PermissionName = 'dashboard.view' | 'users.view' | 'users.manage' | 'partners.review' | 'settings.manage' | 'roles.manage' | 'pages.manage'

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
    { name: 'partners.review', label: 'Review scouts and billposters', description: 'Approve, reject or suspend people who apply to scout or print and post.' },
    { name: 'settings.manage', label: 'Change settings', description: 'Change upload limits and other app settings.' },
    { name: 'roles.manage', label: 'Manage roles', description: 'Create roles and choose what each one allows.' },
    { name: 'pages.manage', label: 'Manage pages', description: 'Write the privacy policy, terms, about page and any other pages.' },
  ]

  static names(): PermissionName[] {
    return Permission.ALL.map((permission) => permission.name)
  }
}
