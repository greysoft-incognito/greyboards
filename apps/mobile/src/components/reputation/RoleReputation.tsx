import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import type { AccountRoleKind, ReputationEvent, RoleReputation, RoleStanding } from '@greyboards/types'
import { ROLE_ICONS } from '@/components/AccountRoles'
import { Text } from '@/components/ui'
import { api } from '@/lib/api'
import { colors, fonts, radius } from '@/theme'
import { Score, Standing } from './Badges'

const day = (value: string) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

function Progress({ label, have, need, unit }: { label: string; have: number; need: number; unit: string }) {
  const share = need > 0 ? Math.min(100, Math.max(0, (have / need) * 100)) : 100

  return (
    <View style={styles.progress}>
      <View style={styles.progressHead}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text variant="small">
          {Math.min(have, need)} / {need} {unit}
        </Text>
      </View>
      <View style={styles.track}>
        <LinearGradient colors={[colors.brand400, colors.brand600]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fill, { width: `${share}%` }]} />
      </View>
    </View>
  )
}

/** A role's score, badges, how far it is from the proven badge, and its latest changes. */
export function RoleReputationPanel({ kind, reputation }: { kind: AccountRoleKind; reputation: RoleReputation }) {
  const [history, setHistory] = useState<ReputationEvent[]>([])
  const { progress } = reputation

  useEffect(() => {
    api.account
      .reputation(kind, { per_page: 5 })
      .send()
      .then(({ data }) => setHistory(data))
      .catch(() => undefined)
  }, [kind, reputation.score])

  return (
    <View style={styles.panel}>
      <View style={styles.head}>
        <Text style={styles.title}>Reputation in this role</Text>
        <Score value={reputation.score} />
      </View>
      <Standing standing={reputation} showScore={false} />
      {reputation.verifiedAt ? <Text variant="small">Verified by Greyboards staff on {day(reputation.verifiedAt)}.</Text> : null}
      {reputation.provenAt ? (
        <Text variant="small">Proven on {day(reputation.provenAt)}.</Text>
      ) : (
        <View style={styles.bars}>
          <Progress label="Score" have={progress.score.have} need={progress.score.need} unit="points" />
          <Progress label="Checked actions" have={progress.actions.have} need={progress.actions.need} unit="" />
          <Progress label="Days in role" have={progress.days.have} need={progress.days.need} unit="days" />
        </View>
      )}
      {history.length ? (
        <View style={styles.history}>
          {history.map((event) => (
            <View key={event.id} style={styles.event}>
              <Text style={[styles.points, { color: event.points < 0 ? colors.red700 : colors.available }]}>{event.points > 0 ? `+${event.points}` : event.points}</Text>
              <View style={styles.flex}>
                <Text style={styles.eventText}>
                  {event.label}
                  {event.note ? `: ${event.note}` : ''}
                </Text>
                <Text variant="small">{day(event.createdAt)}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
      <Pressable accessibilityRole="link" onPress={() => router.push('/reputation')}>
        <Text variant="small">
          Points only come from work Greyboards could check. <Text style={styles.link}>See what earns them and what the badges mean</Text>
        </Text>
      </Pressable>
    </View>
  )
}

const STEWARD_LABELS: Partial<Record<RoleStanding['kind'], string>> = { owner: 'Owner', scout: 'Scout who runs it' }

/** The reputation of the people behind a board, so advertisers can judge who they deal with. */
export function BoardStewards({ stewards }: { stewards: RoleStanding[] | undefined }) {
  if (!stewards?.length) return null

  return (
    <View style={styles.stewards}>
      {stewards.map((standing) => {
        const Icon = ROLE_ICONS[standing.kind]

        return (
          <View key={standing.kind} style={styles.steward}>
            <Icon size={16} color={colors.ink500} />
            <Text style={styles.stewardLabel}>{STEWARD_LABELS[standing.kind] ?? standing.kind}</Text>
            <Standing standing={standing} compact />
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  panel: { gap: 12, padding: 16, borderRadius: radius.xl - 2, backgroundColor: colors.canvas },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 14, fontFamily: fonts.bold, color: colors.ink900 },
  bars: { gap: 10 },
  progress: { gap: 6 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 12, lineHeight: 16, fontFamily: fonts.medium, color: colors.ink700 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surface200, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  history: { gap: 8 },
  event: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  points: { width: 40, textAlign: 'right', fontSize: 14, fontFamily: fonts.bold },
  eventText: { fontSize: 14, lineHeight: 20, color: colors.ink700 },
  link: { fontSize: 12, fontFamily: fonts.semibold, color: colors.brand600 },
  stewards: { gap: 8 },
  steward: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  stewardLabel: { fontSize: 14, fontFamily: fonts.medium, color: colors.ink700 },
})
