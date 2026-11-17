import { Pressable, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { MapPin, Ruler } from 'lucide-react-native'
import type { AccountRole, Board, BoardRate, BoardStatus } from '@greyboards/types'
import { BoardScene } from '@/components/BoardScene'
import { Text } from '@/components/ui'
import { colors, fonts, radius, surfaces } from '@/theme'

const STATUS: Record<BoardStatus, { label: string; background: string; color: string }> = {
  pending: { label: 'Waiting for review', background: colors.amber50, color: colors.held },
  listed: { label: 'On the map', background: colors.emerald50, color: colors.available },
  rejected: { label: 'Not approved', background: colors.red50, color: colors.red700 },
  unlisted: { label: 'Off the map', background: colors.surface100, color: colors.ink700 },
}

/** Where a board's review stands, as a small badge. */
export function BoardStatusBadge({ status }: { status: BoardStatus }) {
  const look = STATUS[status]

  return (
    <View style={[styles.badge, { backgroundColor: look.background }]}>
      <View style={[styles.dot, { backgroundColor: look.color }]} />
      <Text style={[styles.badgeText, { color: look.color }]}>{look.label}</Text>
    </View>
  )
}

/** A rate such as "₦850,000 / month". */
export function formatRate(rate: BoardRate | null) {
  if (!rate) return null

  const amount = new Intl.NumberFormat('en-NG', { style: 'currency', currency: rate.currency, maximumFractionDigits: 0 }).format(rate.amountMinor / 100)

  return `${amount} / ${rate.period}`
}

/** Width by height, such as "12 × 4 m". */
export function formatSize(board: Pick<Board, 'widthM' | 'heightM'>) {
  const metres = (value: number) => Number(Number(value).toFixed(1)).toString()

  return `${metres(board.widthM)} × ${metres(board.heightM)} m`
}

/** Where the board is in words, or its coordinates. */
export function boardPlace(board: Pick<Board, 'address' | 'city' | 'latitude' | 'longitude'>) {
  return [board.address, board.city].filter(Boolean).join(', ') || `${board.latitude.toFixed(5)}, ${board.longitude.toFixed(5)}`
}

/** The roles this account can tag boards as: its own boards, or ones it scouts. */
export function taggingRoles(roles: AccountRole[]): ('owner' | 'scout')[] {
  return (['owner', 'scout'] as const).filter((kind) => roles.some((role) => role.kind === kind && role.status === 'active'))
}

/** The board's photo, or a drawn board while it has none. */
export function BoardCover({ board, style }: { board: Pick<Board, 'coverUrl' | 'lit'>; style?: object }) {
  return (
    <View style={[styles.cover, style]}>
      {board.coverUrl ? (
        <Image source={{ uri: board.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <BoardScene time={board.lit ? 'night' : 'day'} art="empty" headline="Photo coming" />
      )}
    </View>
  )
}

/** A board in a list: its photo, name, review status, place and size. */
export function BoardRow({ board }: { board: Board }) {
  return (
    <Pressable accessibilityRole="link" onPress={() => router.push(`/boards/${board.id}`)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <BoardCover board={board} style={styles.thumb} />
      <View style={styles.body}>
        <BoardStatusBadge status={board.status} />
        <Text style={styles.name} numberOfLines={2}>
          {board.name}
        </Text>
        <View style={styles.meta}>
          <MapPin size={14} color={colors.ink500} />
          <Text variant="small" numberOfLines={1} style={styles.flex}>
            {boardPlace(board)}
          </Text>
        </View>
        <View style={styles.meta}>
          <Ruler size={14} color={colors.ink500} />
          <Text variant="small">
            {board.kindLabel}, {formatSize(board)}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bold },
  cover: { aspectRatio: 400 / 260, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface100 },
  row: { ...surfaces.panel, flexDirection: 'row', gap: 14, padding: 12 },
  pressed: { borderColor: colors.brand200 },
  thumb: { width: 112, aspectRatio: undefined, height: 96 },
  body: { flex: 1, gap: 5, paddingVertical: 2 },
  name: { fontFamily: fonts.displayHeavy, fontSize: 17, lineHeight: 22, letterSpacing: -0.4, color: colors.ink900 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flex: { flex: 1 },
})

const POINTS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']

/** "Faces north-east" for a compass heading in degrees. */
export function formatHeading(degrees: number) {
  return `Faces ${POINTS[Math.round(degrees / 45) % 8]}`
}
