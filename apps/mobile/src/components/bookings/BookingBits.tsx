import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { router, type Href } from 'expo-router'
import { CalendarDays } from 'lucide-react-native'
import type { Board, BookingStatus, Booking } from '@greyboards/types'
import { BoardCover } from '@/components/boards/BoardBits'
import { Pill, type PillLook, Text } from '@/components/ui'
import { formatDays, formatMoney } from '@/lib/format'
import { colors, fonts, surfaces } from '@/theme'

const STATUS: Record<BookingStatus, PillLook> = {
  held: { label: 'Waiting for payment', background: colors.amber50, color: colors.held },
  paid: { label: 'Paid, held in escrow', background: colors.brand50, color: colors.brand700 },
  live: { label: 'Up on the board', background: colors.emerald50, color: colors.available },
  completed: { label: 'Finished', background: colors.surface100, color: colors.ink700 },
  cancelled: { label: 'Cancelled', background: colors.surface100, color: colors.ink500 },
  expired: { label: 'Hold ran out', background: colors.surface100, color: colors.ink500 },
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Pill {...STATUS[status]} />
}

/** A row in a list of bookings, offers or bids: the board, a badge, the days and an amount. */
export function ListRow({
  board,
  badge,
  days,
  amount,
  amountLabel,
  to,
  children,
}: {
  board: Board | null | undefined
  badge: ReactNode
  days: string
  amount: string
  amountLabel?: string
  to?: Href
  children?: ReactNode
}) {
  const body = (
    <View style={styles.top}>
      {board ? <BoardCover board={board} style={styles.thumb} /> : null}
      <View style={styles.body}>
        {badge}
        <Text style={styles.name} numberOfLines={2}>
          {board?.name ?? 'Board'}
        </Text>
        <View style={styles.meta}>
          <CalendarDays size={14} color={colors.ink500} />
          <Text variant="small" style={styles.flex}>
            {days}
          </Text>
        </View>
        <Text style={styles.amount}>
          {amount}
          {amountLabel ? <Text variant="small"> {amountLabel}</Text> : null}
        </Text>
      </View>
    </View>
  )

  if (!to) {
    return (
      <View style={styles.row}>
        {body}
        {children}
      </View>
    )
  }

  return (
    <Pressable accessibilityRole="link" onPress={() => router.push(to)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {body}
      {children}
    </Pressable>
  )
}

/** A booking in a list: the board, the days, the amount and where it stands. */
export function BookingRow({ booking, amountMinor = booking.amountMinor, amountLabel }: { booking: Booking; amountMinor?: number; amountLabel?: string }) {
  return (
    <ListRow
      board={booking.board}
      badge={<BookingStatusBadge status={booking.status} />}
      days={formatDays(booking)}
      amount={formatMoney(amountMinor, booking.currency)}
      amountLabel={amountLabel}
      to={{ pathname: '/bookings/[id]', params: { id: booking.id } }}
    />
  )
}

/** Label and value lines in a tinted box, with an optional total. */
export function Summary({ rows, total }: { rows: { label: string; value: string }[]; total?: { label: string; value: string } }) {
  return (
    <View style={styles.summary}>
      {rows.map((row) => (
        <View key={row.label} style={styles.summaryRow}>
          <Text variant="muted" style={styles.flex}>
            {row.label}
          </Text>
          <Text style={styles.summaryValue}>{row.value}</Text>
        </View>
      ))}
      {total ? (
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={[styles.flex, styles.totalLabel]}>{total.label}</Text>
          <Text style={styles.total}>{total.value}</Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { ...surfaces.panel, padding: 12, gap: 12 },
  pressed: { backgroundColor: colors.surface100 },
  top: { flexDirection: 'row', gap: 14 },
  thumb: { width: 104, height: 104, aspectRatio: undefined },
  body: { flex: 1, gap: 5, paddingVertical: 2 },
  name: { fontFamily: fonts.displayHeavy, fontSize: 16, lineHeight: 21, letterSpacing: -0.3, color: colors.ink900 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  amount: { fontFamily: fonts.displayHeavy, fontSize: 16, color: colors.ink900 },
  summary: { gap: 8, padding: 14, borderRadius: 16, backgroundColor: colors.canvas },
  summaryRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  summaryValue: { fontSize: 14, color: colors.ink900, textAlign: 'right', flexShrink: 1 },
  totalRow: { paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.surface200 },
  totalLabel: { fontFamily: fonts.semibold, fontSize: 14 },
  total: { fontFamily: fonts.displayHeavy, fontSize: 19, color: colors.ink900 },
})
