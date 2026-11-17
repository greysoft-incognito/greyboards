import { useCallback } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { ArrowRight } from 'lucide-react-native'
import type { AccountRoleKind } from '@greyboards/types'
import { RoleIcon, RoleStatus } from '@/components/AccountRoles'
import { useTabBarInset } from '@/components/GlassTabBar'
import { Text } from '@/components/ui'
import { api } from '@/lib/api'
import { session, useUser } from '@/lib/session'
import { colors, fonts, radius } from '@/theme'

/** What each role's area will hold, shown until it has something in it. */
const EMPTY: Record<AccountRoleKind, string> = {
  advertiser: 'Your campaigns will show here once you book a board.',
  owner: 'Your boards and their bookings will show here once you list one.',
  scout: 'Boards you tag and owners you sign will show here.',
  billposter: 'Print-and-post jobs near you will show here.',
}

/** The signed-in home: one card for each marketplace role the account holds. */
export default function Dashboard() {
  const user = useUser()
  const inset = useTabBarInset()
  const firstName = user.name.split(/\s+/)[0]

  const refresh = useCallback(() => {
    api.auth
      .me()
      .send()
      .then(({ data }) => session.setUser(data))
      .catch(() => undefined)
  }, [])

  useFocusEffect(refresh)

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.page, { paddingBottom: 32 + inset }]}
      refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
    >
      <View style={styles.header}>
        <Text variant="display">Hello, {firstName}</Text>
        <Text variant="muted">Everything you do on Greyboards, in one place.</Text>
      </View>

      {user.accountRoles.map((role) => (
        <View key={role.id} style={styles.card}>
          <View style={styles.cardTop}>
            <RoleIcon kind={role.kind} />
            <Text variant="title" style={styles.flex}>
              {role.label}
            </Text>
          </View>
          <RoleStatus status={role.status} />
          <Text variant="muted">
            {role.status === 'active'
              ? EMPTY[role.kind]
              : role.status === 'pending'
                ? "We're checking your application. We'll email you when it's done."
                : (role.note ?? "This role isn't active. Contact support if you think that's a mistake.")}
          </Text>
        </View>
      ))}

      <Pressable accessibilityRole="button" onPress={() => router.push('/settings/roles')} style={({ pressed }) => [styles.card, styles.more, pressed && styles.pressed]}>
        <View style={styles.flex}>
          <Text style={styles.moreTitle}>{user.accountRoles.length ? 'Do more on Greyboards' : "Choose how you'll use Greyboards"}</Text>
          <Text variant="muted">Advertise, list your own boards, scout boards for owners, or print and post.</Text>
        </View>
        <ArrowRight size={20} color={colors.brand500} />
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.canvas },
  page: { padding: 16, gap: 14 },
  header: { gap: 4, paddingTop: 4, paddingBottom: 6 },
  flex: { flex: 1 },
  card: { gap: 12, padding: 18, borderRadius: radius.xl + 4, borderWidth: 1.5, borderColor: colors.surface200, backgroundColor: colors.white },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  more: { flexDirection: 'row', alignItems: 'center', gap: 14, borderStyle: 'dashed' },
  moreTitle: { fontFamily: fonts.display, fontSize: 18, lineHeight: 24, color: colors.ink900, marginBottom: 2 },
  pressed: { borderColor: colors.brand300 },
})
