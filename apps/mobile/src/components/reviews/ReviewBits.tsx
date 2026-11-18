import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Star } from 'lucide-react-native'
import type { BookingReviews, PublishedReview, RatingSummary } from '@greyboards/types'
import { Standing } from '@/components/reputation/Badges'
import { Section } from '@/components/settings/SettingsPage'
import { Button, Callout, Input, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { formatDay } from '@/lib/format'
import { useAction } from '@/lib/use-action'
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

/** Rate the board, or the advertiser, once the ad is up. A review can be changed until the window closes. */
export function ReviewSection({ bookingId, reviews, onChange }: { bookingId: string; reviews: BookingReviews; onChange: () => void }) {
  const action = useAction()
  const [rating, setRating] = useState(reviews.mine?.rating ?? 0)
  const [body, setBody] = useState(reviews.mine?.body ?? '')
  const [editing, setEditing] = useState(!reviews.mine)
  const about = reviews.subject === 'board' ? 'the board' : 'the advertiser'

  if (!reviews.subject || (!reviews.canWrite && !reviews.mine)) return null

  const save = () =>
    action.run(async () => {
      await api.review(bookingId, { rating, body: body.trim() || null }).send()
      setEditing(false)
      onChange()

      return 'Thanks for your review.'
    })

  return (
    <Section title={reviews.mine ? `Your review of ${about}` : `How was ${about}?`}>
      {reviews.advertiserRating && reviews.advertiserRating.count > 0 ? (
        <View style={styles.line}>
          <Text variant="muted">Others rated this advertiser</Text>
          <RatingLine rating={reviews.advertiserRating} />
        </View>
      ) : null}
      {reviews.advertiserStanding ? (
        <View style={styles.line}>
          <Text variant="muted">The advertiser’s standing</Text>
          <Standing standing={reviews.advertiserStanding} compact />
        </View>
      ) : null}
      {reviews.mine && !editing ? (
        <>
          <Stars rating={reviews.mine.rating} size={20} />
          {reviews.mine.body ? <Text style={styles.body}>{reviews.mine.body}</Text> : null}
          {reviews.canWrite ? <Button title="Change it" variant="ghost" onPress={() => setEditing(true)} /> : null}
        </>
      ) : (
        <>
          <View style={styles.stars} accessibilityRole="radiogroup" accessibilityLabel="Stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} accessibilityRole="radio" accessibilityState={{ checked: rating === star }} accessibilityLabel={`${star} ${star === 1 ? 'star' : 'stars'}`} onPress={() => setRating(star)} hitSlop={4}>
                <Star size={32} color={star <= rating ? colors.amber400 : colors.surface300} fill={star <= rating ? colors.amber400 : 'transparent'} />
              </Pressable>
            ))}
          </View>
          <Input
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={1000}
            accessibilityLabel="Your review"
            placeholder={reviews.subject === 'board' ? 'Was it seen? Was it put up well and on time?' : 'Did they send artwork on time? Were they easy to work with?'}
          />
          <Button title={reviews.mine ? 'Save review' : 'Post review'} loading={action.busy} disabled={!rating} onPress={save} />
        </>
      )}
      {action.problem.message ? <Callout>{action.problem.message}</Callout> : null}
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
