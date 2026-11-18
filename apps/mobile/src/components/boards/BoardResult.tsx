import { Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Lightbulb, MapPin, Ruler, Star } from 'lucide-react-native'
import type { Board } from '@greyboards/types'
import { Text } from '@/components/ui'
import { formatDistance, formatMoney } from '@/lib/format'
import { colors, fonts, shadows, surfaces } from '@/theme'
import { BoardCover, boardPlace, formatSize } from './BoardBits'

/** A board in search results: its photo, price, size and how far it is. */
export function BoardResult({ board, active = false }: { board: Board; active?: boolean }) {
  return (
    <Pressable accessibilityRole="link" onPress={() => router.push(`/boards/${board.id}`)} style={({ pressed }) => [styles.card, active && styles.active, pressed && styles.pressed]}>
      <BoardCover board={board} style={styles.cover} />
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={styles.name} numberOfLines={1}>
            {board.name}
          </Text>
          {board.rating.average !== null ? (
            <View style={styles.rating}>
              <Star size={13} color={colors.amber400} fill={colors.amber400} />
              <Text style={styles.ratingText}>{board.rating.average.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.meta}>
          <MapPin size={14} color={colors.ink500} />
          <Text variant="small" numberOfLines={1} style={styles.flex}>
            {board.distanceM !== null ? `${formatDistance(board.distanceM)} · ` : ''}
            {boardPlace(board)}
          </Text>
        </View>
        <View style={styles.meta}>
          <Ruler size={14} color={colors.ink500} />
          <Text variant="small">
            {board.kindLabel}, {formatSize(board)}
          </Text>
          {board.lit ? (
            <>
              <Lightbulb size={14} color={colors.held} />
              <Text variant="small">Lit</Text>
            </>
          ) : null}
        </View>
        {board.rate ? (
          <Text style={styles.price}>
            {formatMoney(board.rate.amountMinor, board.rate.currency)}
            <Text variant="small"> / {board.loop ? `slot a ${board.rate.period}` : board.rate.period}</Text>
          </Text>
        ) : (
          <Text variant="small">No price yet</Text>
        )}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { ...surfaces.panel, flexDirection: 'row', gap: 12, padding: 10 },
  active: { borderColor: colors.brand300, boxShadow: `0 0 0 4px rgba(131,59,75,0.12), ${shadows.card}` },
  pressed: { backgroundColor: colors.surface100 },
  cover: { width: 104, height: 104, aspectRatio: undefined },
  body: { flex: 1, gap: 4, paddingVertical: 2 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontFamily: fonts.displayHeavy, fontSize: 16, lineHeight: 21, letterSpacing: -0.3, color: colors.ink900 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 12, fontFamily: fonts.bold, color: colors.ink700 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  price: { marginTop: 'auto', fontFamily: fonts.displayHeavy, fontSize: 17, color: colors.ink900 },
})
