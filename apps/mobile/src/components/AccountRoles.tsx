import { StyleSheet, View } from 'react-native'
import { Binoculars, type LucideIcon, Megaphone, PaintRoller, Presentation } from 'lucide-react-native'
import type { AccountRole, AccountRoleKind, AccountRoleStatus } from '@greyboards/types'
import { Text } from '@/components/ui'
import { colors, fonts, radius } from '@/theme'

/** The Lucide icon for each marketplace role, as on the web. */
export const ROLE_ICONS: Record<AccountRoleKind, LucideIcon> = {
  advertiser: Megaphone,
  owner: Presentation,
  scout: Binoculars,
  billposter: PaintRoller,
}

const STATUS: Record<AccountRoleStatus, { label: string; background: string; color: string }> = {
  active: { label: 'Active', background: colors.emerald50, color: colors.available },
  pending: { label: 'Waiting for review', background: colors.amber50, color: colors.held },
  rejected: { label: 'Not approved', background: colors.red50, color: colors.red700 },
  suspended: { label: 'Suspended', background: colors.surface100, color: colors.ink700 },
}

/** Where a role's review stands, as a small badge. */
export function RoleStatus({ status }: { status: AccountRoleStatus }) {
  const look = STATUS[status]

  return (
    <View style={[styles.badge, { backgroundColor: look.background }]}>
      <View style={[styles.dot, { backgroundColor: look.color }]} />
      <Text style={[styles.badgeText, { color: look.color }]}>{look.label}</Text>
    </View>
  )
}

/** A role's icon in a wine tile. */
export function RoleIcon({ kind, size = 44 }: { kind: AccountRoleKind; size?: number }) {
  const Icon = ROLE_ICONS[kind]

  return (
    <View style={[styles.tile, { width: size, height: size }]}>
      <Icon size={size * 0.5} color={colors.brand600} />
    </View>
  )
}

/** The role the account holds of `kind`, if any. */
export function heldRole(roles: AccountRole[], kind: AccountRoleKind) {
  return roles.find((role) => role.kind === kind)
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bold },
  tile: { borderRadius: radius.xl, backgroundColor: colors.brand50, alignItems: 'center', justifyContent: 'center' },
})
