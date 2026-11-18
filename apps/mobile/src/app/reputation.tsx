import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { ChevronLeft, Gauge, Minus, Plus } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRequest } from 'alova/client'
import type { AccountRoleKind, ReputationDisclosure } from '@greyboards/types'
import { ROLE_ICONS } from '@/components/AccountRoles'
import { BadgeChip } from '@/components/reputation/Badges'
import { Text } from '@/components/ui'
import { api } from '@/lib/api'
import { brandSweep, colors, fonts, radius, shadows, surfaces } from '@/theme'

const ROLE_NAMES: Record<AccountRoleKind, string> = { advertiser: 'Advertisers', owner: 'Owners', scout: 'Scouts', dispatch: 'Dispatchers' }

/** What reputation and the two badges mean, with the numbers in use now. Open to anyone who sees a badge. */
export default function ReputationScreen() {
  const insets = useSafeAreaInsets()
  const { data, loading, error } = useRequest(() => api.reputation())
  const disclosure = data?.data as ReputationDisclosure | undefined

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.page, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={8} style={styles.back}>
        <ChevronLeft size={24} color={colors.ink900} />
      </Pressable>

      <LinearGradient colors={brandSweep} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={styles.hero}>
        <Gauge size={30} color={colors.brand100} />
        <Text style={styles.heroTitle}>Reputation and badges</Text>
        <Text style={styles.heroText}>
          A reputation score shows how much you can trust someone in a role. Each role has its own score, and it only moves for real work we could confirm.
        </Text>
      </LinearGradient>

      {loading && !disclosure ? <ActivityIndicator color={colors.brand600} /> : null}
      {error && !disclosure ? <Text variant="muted">This page isn't available right now.</Text> : null}

      {disclosure?.badges.map((badge) => (
        <View key={badge.key} style={styles.card}>
          <BadgeChip kind={badge.key} large />
          <Text style={styles.cardTitle}>{badge.label}</Text>
          <Text style={styles.summary}>{badge.summary}</Text>
          <Text variant="muted">{badge.description}</Text>
        </View>
      ))}

      {disclosure ? (
        <View style={styles.rules}>
          <Text style={styles.rulesTitle}>What moves a score</Text>
          {disclosure.rules.map((rule) => {
            const down = rule.points < 0

            return (
              <View key={rule.action} style={styles.rule}>
                <View style={[styles.ruleIcon, down && styles.ruleIconDown]}>{down ? <Minus size={18} color={colors.red700} /> : <Plus size={18} color={colors.brand600} />}</View>
                <View style={styles.flex}>
                  <Text style={styles.ruleLabel}>{rule.label}</Text>
                  <View style={styles.roles}>
                    {rule.roles.map((kind) => {
                      const Icon = ROLE_ICONS[kind]

                      return (
                        <View key={kind} style={styles.role}>
                          <Icon size={13} color={colors.ink500} />
                          <Text variant="small">{ROLE_NAMES[kind]}</Text>
                        </View>
                      )
                    })}
                  </View>
                </View>
                <Text style={[styles.rulePoints, down && styles.down]}>{rule.points > 0 ? `+${rule.points}` : rule.points}</Text>
              </View>
            )
          })}
          <Text variant="muted" style={styles.ruleFoot}>
            Greyboards staff can also correct a score by hand, and always record why.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  page: { paddingHorizontal: 16, gap: 14 },
  flex: { flex: 1, gap: 4 },
  back: { alignSelf: 'flex-start', marginLeft: -2, paddingVertical: 4 },
  hero: { borderRadius: radius.xl + 4, padding: 22, gap: 8, boxShadow: shadows.hero },
  heroTitle: { marginTop: 6, fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 36, letterSpacing: -0.9, color: colors.white },
  heroText: { fontSize: 14, lineHeight: 21, color: colors.brand100 },
  card: { ...surfaces.panel, padding: 20, gap: 8 },
  cardTitle: { marginTop: 6, fontFamily: fonts.display, fontSize: 19, lineHeight: 24, color: colors.ink900 },
  summary: { fontSize: 14, lineHeight: 20, fontFamily: fonts.semibold, color: colors.ink700 },
  rules: { ...surfaces.panel, overflow: 'hidden' },
  rulesTitle: { paddingHorizontal: 20, paddingVertical: 14, fontFamily: fonts.display, fontSize: 17, color: colors.ink900, borderBottomWidth: 1, borderBottomColor: colors.surface100 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.surface100 },
  ruleIcon: { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand50 },
  ruleIconDown: { backgroundColor: colors.red50 },
  ruleLabel: { fontSize: 14, lineHeight: 20, fontFamily: fonts.medium, color: colors.ink900 },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  role: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rulePoints: { fontFamily: fonts.displayHeavy, fontSize: 18, color: colors.ink900 },
  down: { color: colors.red700 },
  ruleFoot: { paddingHorizontal: 20, paddingVertical: 14 },
})
