import { Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { CalendarClock, MapPin } from 'lucide-react-native'
import type { PrintJob, PrintJobStatus } from '@greyboards/types'
import { BoardCover, boardPlace } from '@/components/boards/BoardBits'
import { Text } from '@/components/ui'
import { colors, fonts, radius, surfaces } from '@/theme'

const STATUS: Record<PrintJobStatus, { label: string; background: string; color: string }> = {
  open: { label: 'Open', background: colors.emerald50, color: colors.available },
  reserved: { label: 'Held for you', background: colors.amber50, color: colors.held },
  confirmed: { label: 'Yours', background: colors.brand50, color: colors.brand700 },
  printed: { label: 'Printed', background: colors.brand50, color: colors.brand700 },
  posted: { label: 'Posted', background: colors.surface100, color: colors.ink700 },
  cancelled: { label: 'Cancelled', background: colors.surface100, color: colors.ink500 },
}

export function JobStatusBadge({ status }: { status: PrintJobStatus }) {
  const look = STATUS[status]

  return (
    <View style={[styles.badge, { backgroundColor: look.background }]}>
      <View style={[styles.dot, { backgroundColor: look.color }]} />
      <Text style={[styles.badgeText, { color: look.color }]}>{look.label}</Text>
    </View>
  )
}

/** "₦175,000" from minor units. */
export function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amountMinor / 100)
}

/** "Mon 3 Feb" for a 'YYYY-MM-DD' day. */
export function formatDay(day: string) {
  return new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

/** "800 m" close by, "12.4 km" further out. */
export function formatDistance(metres: number) {
  return metres < 1000 ? `${metres} m` : `${(metres / 1000).toFixed(1)} km`
}

/** A job in a list: the board, how far, when it's due, and the pay. */
export function JobRow({ job }: { job: PrintJob }) {
  const board = job.board

  return (
    <Pressable accessibilityRole="link" onPress={() => router.push(`/jobs/${job.id}`)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {board ? <BoardCover board={board} style={styles.thumb} /> : null}
      <View style={styles.body}>
        <JobStatusBadge status={job.status} />
        <Text style={styles.name} numberOfLines={2}>
          {board?.name ?? 'Board'}
        </Text>
        {board ? (
          <View style={styles.meta}>
            <MapPin size={14} color={colors.ink500} />
            <Text variant="small" numberOfLines={1} style={styles.flex}>
              {job.distanceM !== null ? `${formatDistance(job.distanceM)} away` : boardPlace(board)}
            </Text>
          </View>
        ) : null}
        <View style={styles.meta}>
          <CalendarClock size={14} color={colors.ink500} />
          <Text variant="small" style={styles.flex}>
            Up by {formatDay(job.dueOn)}
          </Text>
          <Text style={styles.pay}>{formatMoney(job.feeMinor, job.currency)}</Text>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bold },
  row: { ...surfaces.panel, flexDirection: 'row', gap: 14, padding: 12 },
  pressed: { borderColor: colors.brand200 },
  thumb: { width: 112, aspectRatio: undefined, height: 104 },
  body: { flex: 1, gap: 5, paddingVertical: 2 },
  name: { fontFamily: fonts.displayHeavy, fontSize: 17, lineHeight: 22, letterSpacing: -0.4, color: colors.ink900 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flex: { flex: 1 },
  pay: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink900 },
})
