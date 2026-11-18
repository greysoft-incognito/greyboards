import { StyleSheet, View } from 'react-native'
import { Star } from 'lucide-react-native'
import type { PublishedReview, RatingSummary } from '@greyboards/types'
import { Section } from '@/components/settings/SettingsPage'
import { Text } from '@/components/ui'
import { formatDay } from '@/lib/format'
import { colors, fonts } from '@/theme'

/** Five stars, filled up to `rating`. */
export function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <View style={styles.stars} accessibilityRole="image" accessibilityLabel={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const lit = star <= Math.round(rating)

        return <Star key={star} size={size} color={lit ? colors.amber400 : colors.surface300} fill={lit ? colors.amber400 : 'transparent'} />
      })}
    </View>
  )
}

/** "4.6 (12 reviews)", or "3 reviews" while too few to average. Nothing before the first review. */
export function RatingLine({ rating }: { rating: RatingSummary }) {
  if (!rating.count) return null

  const reviews = `${rating.count} ${rating.count === 1 ? 'review' : 'reviews'}`

  return (
    <View style={styles.line}>
      {rating.average !== null ? (
        <>
          <Star size={16} color={colors.amber400} fill={colors.amber400} />
          <Text style={styles.average}>{rating.average.toFixed(1)}</Text>
        </>
      ) : null}
      <Text variant="muted">{rating.average !== null ? `(${reviews})` : reviews}</Text>
    </View>
  )
}

/** A board's latest reviews, with its average. */
export function BoardReviews({ reviews, summary }: { reviews: PublishedReview[]; summary: RatingSummary }) {
  if (!reviews.length) return null

  return (
    <Section title="What advertisers say">
      <RatingLine rating={summary} />
      {reviews.map((review) => (
        <View key={review.id} style={styles.review}>
          <View style={styles.line}>
            <Stars rating={review.rating} size={14} />
            <Text variant="small">
              {review.author ?? 'An advertiser'} · {formatDay(review.createdAt)}
            </Text>
          </View>
          {review.body ? <Text style={styles.body}>{review.body}</Text> : null}
        </View>
      ))}
    </Section>
  )
}

const styles = StyleSheet.create({
  stars: { flexDirection: 'row', gap: 2 },
  line: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  average: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink900 },
  review: { gap: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.surface100 },
  body: { fontSize: 14, lineHeight: 20, color: colors.ink700 },
})
