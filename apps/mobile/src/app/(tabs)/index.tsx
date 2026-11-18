import { useCallback } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { ArrowRight } from 'lucide-react-native'
import type { AccountRoleKind } from '@greyboards/types'
import { ROLE_ICONS, RoleStatus } from '@/components/AccountRoles'
import { BoardScene, type SceneArt, type SceneTime } from '@/components/BoardScene'
import { useTabBarInset } from '@/components/GlassTabBar'
import { Text } from '@/components/ui'
import { api } from '@/lib/api'
import { session, useUser } from '@/lib/session'
import { brandSweep, colors, fonts, radius, shadows, surfaces } from '@/theme'

/** What each role's area will hold, shown until it has something in it. */
const EMPTY: Record<AccountRoleKind, string> = {
  advertiser: 'Your campaigns will show here once you book a board.',
  owner: 'Your boards and their bookings will show here once you list one.',
  scout: 'Boards you tag and owners you sign will show here.',
  dispatch: 'Print-and-post jobs near you will show here.',
}

/** The drawn board on each role's card, as on the web. */
const SCENES: Record<AccountRoleKind, { time: SceneTime; art: SceneArt; headline: string }> = {
  advertiser: { time: 'dusk', art: 'brand', headline: 'Your ad here' },
  owner: { time: 'day', art: 'empty', headline: 'Free from 1 Dec' },
  scout: { time: 'night', art: 'dark', headline: 'New board' },
  dispatch: { time: 'day', art: 'brand', headline: 'Up by Friday' },
}

/** The signed-in home: one card for each marketplace role the account holds. */
export default function Dashboard() {
  const user = useUser()
  const inset = useTabBarInset()
  const firstName = user.name.split(/\s+/)[0]
  const active = user.accountRoles.filter((role) => role.status === 'active').length
  const pending = user.accountRoles.filter((role) => role.status === 'pending').length

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
      <LinearGradient colors={brandSweep} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={styles.hero}>
        <Text style={styles.heroKicker}>Your Greyboards</Text>
        <Text style={styles.heroTitle}>Hello, {firstName}</Text>
        <Text style={styles.heroText}>
          {active === 1 ? 'You have 1 role' : `You have ${active} roles`}
          {pending ? `, and ${pending === 1 ? '1 application is' : `${pending} applications are`} being checked.` : '.'}
        </Text>
      </LinearGradient>

      {user.accountRoles.map((role) => {
        const Icon = ROLE_ICONS[role.kind]

        return (
          <View key={role.id} style={styles.card}>
            <View style={styles.thumb}>
              <BoardScene {...SCENES[role.kind]} />
            </View>
            <View style={styles.cardBody}>
              <RoleStatus status={role.status} />
              <View style={styles.cardTitle}>
                <Icon size={18} color={colors.brand600} />
                <Text style={styles.roleName}>{role.label}</Text>
              </View>
              <Text variant="small" style={styles.cardText}>
                {role.status === 'active'
                  ? EMPTY[role.kind]
                  : role.status === 'pending'
                    ? "We're checking your application. We'll email you when it's done."
                    : (role.note ?? "This role isn't active. Contact support if you think that's a mistake.")}
              </Text>
            </View>
          </View>
        )
      })}

      <Pressable accessibilityRole="button" onPress={() => router.push('/settings/roles')} style={({ pressed }) => [styles.more, pressed && styles.pressed]}>
        <View style={styles.flex}>
          <Text style={styles.moreTitle}>{user.accountRoles.length ? 'Do more on Greyboards' : "Choose how you'll use Greyboards"}</Text>
          <Text variant="muted">Advertise, list your own boards, scout boards for owners, or print and post.</Text>
        </View>
        <View style={styles.arrow}>
          <ArrowRight size={20} color={colors.white} />
        </View>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.canvas },
  page: { padding: 16, gap: 14 },
  flex: { flex: 1 },
  hero: { borderRadius: radius.xl + 4, padding: 22, gap: 4, boxShadow: shadows.hero },
  heroKicker: { fontSize: 13, lineHeight: 18, color: colors.brand100 },
  heroTitle: { fontFamily: fonts.displayHeavy, fontSize: 32, lineHeight: 38, letterSpacing: -1, color: colors.white },
  heroText: { marginTop: 6, fontSize: 14, lineHeight: 20, color: colors.brand100 },
  card: { ...surfaces.panel, flexDirection: 'row', gap: 14, padding: 12 },
  thumb: { width: 108, height: 96, borderRadius: radius.lg, overflow: 'hidden' },
  cardBody: { flex: 1, gap: 6, paddingVertical: 2 },
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roleName: { fontFamily: fonts.displayHeavy, fontSize: 18, lineHeight: 24, letterSpacing: -0.4, color: colors.ink900 },
  cardText: { fontSize: 13, lineHeight: 18 },
  more: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: radius.xl, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.surface300 },
  moreTitle: { fontFamily: fonts.displayHeavy, fontSize: 18, lineHeight: 24, letterSpacing: -0.4, color: colors.ink900, marginBottom: 2 },
  arrow: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand500, alignItems: 'center', justifyContent: 'center', boxShadow: shadows.glow },
  pressed: { backgroundColor: colors.white, borderColor: colors.brand300 },
})
