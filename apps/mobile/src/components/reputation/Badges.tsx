import { useState } from 'react'
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { Award, Gauge, type LucideIcon, ShieldCheck } from 'lucide-react-native'
import type { BadgeKey, RoleStanding } from '@greyboards/types'
import { Button, Sheet, Text } from '@/components/ui'
import { colors, fonts, radius } from '@/theme'

interface BadgeLook {
  label: string
  title: string
  icon: LucideIcon
  summary: string
}

/** The two badges look different on purpose: staff verification is solid wine, the earned badge is an amber outline. */
export const BADGES: Record<BadgeKey, BadgeLook> = {
  verified: {
    label: 'Verified',
    title: 'Verified by Greyboards',
    icon: ShieldCheck,
    summary: 'Checked in person by Greyboards staff. Points can’t earn it.',
  },
  proven: {
    label: 'Proven',
    title: 'Proven',
    icon: Award,
    summary: 'Earned through work we could confirm, like accepted proof photos and signed agreements. Staff haven’t checked them in person.',
  },
}

/** A badge's chip, without the note it opens. */
export function BadgeChip({ kind, compact = false, large = false }: { kind: BadgeKey; compact?: boolean; large?: boolean }) {
  const look = BADGES[kind]
  const Icon = look.icon
  const size = compact ? 12 : large ? 16 : 14
  const box: ViewStyle[] = [styles.chip, compact && styles.compact, large && styles.large].filter(Boolean) as ViewStyle[]
  const label = <Text style={[styles.chipText, compact && styles.compactText, large && styles.largeText, kind === 'verified' && styles.white]}>{look.label}</Text>

  if (kind === 'verified') {
    return (
      <LinearGradient colors={[colors.brand500, colors.brand700]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[...box, styles.verified]}>
        <Icon size={size} color={colors.white} />
        {label}
      </LinearGradient>
    )
  }

  return (
    <View style={[...box, styles.proven]}>
      <Icon size={size} color={colors.amber500} />
      {label}
    </View>
  )
}

/** One badge that opens a short note on what it means, with a way to the full explanation. */
export function Badge({ kind, compact = false }: { kind: BadgeKey; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const look = BADGES[kind]
  const Icon = look.icon

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`${look.title}. What this means`} onPress={() => setOpen(true)} hitSlop={6}>
        <BadgeChip kind={kind} compact={compact} />
      </Pressable>
      <Sheet visible={open} title={look.title} onClose={() => setOpen(false)}>
        <View style={styles.noteHead}>
          <Icon size={22} color={kind === 'proven' ? colors.amber500 : colors.brand500} />
          <Text variant="muted" style={styles.flex}>
            {look.summary}
          </Text>
        </View>
        <Button
          title="How badges work"
          variant="secondary"
          onPress={() => {
            setOpen(false)
            router.push('/reputation')
          }}
        />
      </Sheet>
    </>
  )
}

/** The score and any badges a person holds in one role. Shows nothing for a role they don't hold. */
export function Standing({ standing, showScore = true, compact = false }: { standing: RoleStanding | null | undefined; showScore?: boolean; compact?: boolean }) {
  if (!standing) return null
  if (!showScore && !standing.verified && !standing.proven) return null

  return (
    <View style={styles.row}>
      {standing.verified ? <Badge kind="verified" compact={compact} /> : null}
      {standing.proven ? <Badge kind="proven" compact={compact} /> : null}
      {showScore ? <Score value={standing.score} compact={compact} /> : null}
    </View>
  )
}

/** A reputation score as a small chip. */
export function Score({ value, compact = false }: { value: number; compact?: boolean }) {
  const color = value < 0 ? colors.red700 : colors.ink700

  return (
    <View accessibilityLabel={`${value} reputation points`} style={[styles.chip, styles.score, compact && styles.compact]}>
      <Gauge size={compact ? 12 : 14} color={color} />
      <Text style={[styles.chipText, styles.scoreText, compact && styles.compactText, { color }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  compact: { paddingHorizontal: 8, paddingVertical: 2 },
  large: { paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  verified: { boxShadow: '0 6px 16px rgba(131,59,75,0.35)' },
  proven: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.amber400, boxShadow: '0 4px 12px rgba(178,106,0,0.18)' },
  score: { backgroundColor: colors.surface100 },
  chipText: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bold, color: colors.ink900 },
  compactText: { fontSize: 11, lineHeight: 14 },
  largeText: { fontSize: 14, lineHeight: 18 },
  scoreText: { fontFamily: fonts.semibold },
  white: { color: colors.white },
  noteHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
})
