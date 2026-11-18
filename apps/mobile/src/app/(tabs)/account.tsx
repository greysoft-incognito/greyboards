import { useCallback } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { useRequest } from 'alova/client'
import type { AccountRole, DocumentSummary, Session, TwoFactorStatus } from '@greyboards/types'
import { Avatar } from '@/components/Avatar'
import { SETTINGS_GROUPS } from '@/components/settings/groups'
import { useTabBarInset } from '@/components/GlassTabBar'
import { Button, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { session, useUser } from '@/lib/session'
import { colors, fonts, surfaces } from '@/theme'

type Status = { text: string; tone?: 'good' | 'warn' }

/** Who is signed in, every setting grouped like the web's, and a way out. */
export default function Account() {
  const user = useUser()
  const inset = useTabBarInset()
  const logout = useRequest(() => api.auth.logout(), { immediate: false })
  const twoFactor = useRequest(() => api.account.twoFactor(), { immediate: false })
  const devices = useRequest(() => api.account.sessions(), { immediate: false })
  const documents = useRequest(() => api.documents({ per_page: 100 }))
  const twoFactorOn = (twoFactor.data?.data as TwoFactorStatus | undefined)?.enabled
  const deviceCount = (devices.data?.data as Session[] | undefined)?.length
  const about: { label: string; open: () => void }[] = [
    ...((documents.data?.data as DocumentSummary[] | undefined) ?? []).map((document) => ({
      label: document.title,
      open: () => router.push({ pathname: '/pages/[slug]', params: { slug: document.slug } }),
    })),
    { label: 'Reputation and badges', open: () => router.push('/reputation') },
  ]

  const status: Record<string, Status | undefined> = {
    '/settings/profile': { text: user.name },
    '/settings/email': user.emailVerified ? { text: 'Confirmed', tone: 'good' } : { text: 'Not confirmed', tone: 'warn' },
    '/settings/two-step': twoFactorOn === undefined ? undefined : twoFactorOn ? { text: 'On', tone: 'good' } : { text: 'Off', tone: 'warn' },
    '/settings/devices': deviceCount === undefined ? undefined : { text: deviceCount === 1 ? '1 device' : `${deviceCount} devices` },
    '/settings/roles': roleStatus(user.accountRoles),
  }

  useFocusEffect(
    useCallback(() => {
      twoFactor.send().catch(() => undefined)
      devices.send().catch(() => undefined)
    }, []),
  )

  const signOut = async () => {
    await logout.send().catch(() => undefined)
    await session.clear()
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.page, { paddingBottom: 40 + inset }]}>
      <Pressable accessibilityRole="button" onPress={() => router.push('/settings/profile')} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <Avatar user={user} size={56} />
        <View style={styles.flex}>
          <Text variant="title" numberOfLines={1}>
            {user.name}
          </Text>
          <Text variant="muted" numberOfLines={1}>
            {user.email}
          </Text>
        </View>
      </Pressable>

      {SETTINGS_GROUPS.map((group) => (
        <View key={group.label} style={styles.group}>
          <Text style={styles.groupLabel}>{group.label.toUpperCase()}</Text>
          <View style={styles.list}>
            {group.pages.map((page, i) => {
              const state = status[page.to as string]

              return (
                <Pressable
                  key={page.label}
                  accessibilityRole="button"
                  onPress={() => router.push(page.to)}
                  style={({ pressed }) => [styles.row, i > 0 && styles.divided, pressed && styles.pressed]}
                >
                  <View style={styles.flex}>
                    <Text style={[styles.label, page.danger && styles.danger]}>{page.label}</Text>
                    <Text variant="small">{page.hint}</Text>
                  </View>
                  {state ? (
                    <Text numberOfLines={1} style={[styles.state, state.tone === 'good' && styles.good, state.tone === 'warn' && styles.warn]}>
                      {state.text}
                    </Text>
                  ) : null}
                  <ChevronRight size={16} color={colors.ink500} />
                </Pressable>
              )
            })}
          </View>
        </View>
      ))}

      <View style={styles.group}>
        <Text style={styles.groupLabel}>ABOUT</Text>
        <View style={styles.list}>
          {about.map((page, i) => (
            <Pressable key={page.label} accessibilityRole="link" onPress={page.open} style={({ pressed }) => [styles.row, i > 0 && styles.divided, pressed && styles.pressed]}>
              <Text style={[styles.label, styles.flex]}>{page.label}</Text>
              <ChevronRight size={16} color={colors.ink500} />
            </Pressable>
          ))}
        </View>
      </View>

      <Button title={logout.loading ? 'Signing out…' : 'Sign out'} variant="secondary" size="lg" loading={logout.loading} onPress={signOut} />
    </ScrollView>
  )
}

/** How many roles are active, or that one is waiting for review. */
function roleStatus(roles: AccountRole[]): Status {
  const active = roles.filter((role) => role.status === 'active').length

  if (roles.some((role) => role.status === 'pending')) return { text: 'Waiting for review', tone: 'warn' }
  if (!active) return { text: 'None yet', tone: 'warn' }

  return { text: active === 1 ? '1 active' : `${active} active` }
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.canvas },
  page: { padding: 16, gap: 24 },
  flex: { flex: 1, gap: 2 },
  card: { ...surfaces.panel, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  pressed: { backgroundColor: colors.surface100 },
  group: { gap: 8 },
  groupLabel: { paddingHorizontal: 4, fontSize: 12, letterSpacing: 1.6, fontFamily: fonts.semibold, color: colors.ink500 },
  list: { ...surfaces.panel, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  divided: { borderTopWidth: 1, borderTopColor: colors.surface100 },
  label: { fontFamily: fonts.medium, color: colors.ink900 },
  danger: { color: colors.red700 },
  state: { maxWidth: 120, fontSize: 14, color: colors.ink500 },
  good: { color: colors.emerald700 },
  warn: { color: colors.amber700 },
})
