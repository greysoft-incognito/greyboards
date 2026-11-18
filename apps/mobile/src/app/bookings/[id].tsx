import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, View } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { CalendarDays, ChevronRight } from 'lucide-react-native'
import type { Booking, PrintOptions } from '@greyboards/types'
import { BoardCover, formatRate } from '@/components/boards/BoardBits'
import { BookingStatusBadge, Summary } from '@/components/bookings/BookingBits'
import { ArtworkSection, CancelPaid, PayOrCancel, PlaysSection, PrintOffersSection, Refunds, SharesSection, Split, Steps } from '@/components/bookings/BookingSections'
import { DisputeSection } from '@/components/disputes/DisputeSection'
import { MessagesSection } from '@/components/messages/MessagesSection'
import { ProofSection } from '@/components/proofs/ProofSection'
import { ReviewSection } from '@/components/reviews/ReviewBits'
import { Section, SettingsPage } from '@/components/settings/SettingsPage'
import { Callout, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { formatDays, formatMoney, plural } from '@/lib/format'
import { useUser } from '@/lib/session'
import { colors, fonts, radius } from '@/theme'

const DAYPARTS = { all_day: 'All day', morning: 'Morning, 6 AM to noon', afternoon: 'Afternoon, noon to 6 PM', evening: 'Evening, 6 PM to midnight' } as const

/** One booking: the board, the days, the money, and each step from payment to everyone being paid. */
export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const user = useUser()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [printOptions, setPrintOptions] = useState<PrintOptions | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data } = await api.booking(id).send()
      const advertiser = data.advertiserId === user.id

      setBooking(data)
      setPrintOptions(advertiser && data.printJob?.status === 'open' && !data.printJob.priced ? ((await api.printOptions(id).send().catch(() => null))?.data ?? null) : null)
    } catch (error) {
      setProblem(FormProblem.from(error).message)
    }
  }, [id, user.id])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const refresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  if (!booking) {
    return <SettingsPage title="Booking">{problem ? <Callout>{problem}</Callout> : <ActivityIndicator color={colors.brand600} />}</SettingsPage>
  }

  const isAdvertiser = booking.advertiserId === user.id
  const paid = ['paid', 'live', 'completed'].includes(booking.status)
  const reload = () => void load()
  const rows = [
    { label: 'Rate', value: formatRate(booking.rate) ?? '' },
    ...(booking.face ? [{ label: 'Face', value: booking.face.label }] : []),
    ...(booking.slots ? [{ label: 'Slots', value: `${plural(booking.slots.count, 'slot')} · ${DAYPARTS[booking.slots.daypart]}` }] : []),
    { label: 'Length', value: plural(booking.periods, booking.rate.period) },
    ...(booking.printFeeMinor > 0 ? [{ label: 'Printing and posting', value: formatMoney(booking.printFeeMinor, booking.currency) }] : []),
  ]

  return (
    <SettingsPage title={booking.board?.name ?? 'Booking'} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Section>
        <BookingStatusBadge status={booking.status} />
        <View style={styles.line}>
          <CalendarDays size={18} color={colors.ink500} />
          <Text style={styles.days}>{formatDays(booking)}</Text>
        </View>
        <Summary rows={rows} total={{ label: 'Total', value: formatMoney(booking.amountMinor, booking.currency) }} />
        {isAdvertiser && booking.status === 'held' && !booking.shared ? <PayOrCancel booking={booking} onChange={reload} /> : null}
        {booking.shared && booking.shares ? <SharesSection booking={booking} isOrganiser={isAdvertiser} onChange={reload} /> : null}
        {booking.split ? <Split booking={booking} /> : null}
      </Section>

      {booking.board ? (
        <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/boards/[id]', params: { id: booking.board!.id } })} style={({ pressed }) => [styles.board, pressed && styles.pressed]}>
          <BoardCover board={booking.board} style={styles.boardCover} />
          <Text style={styles.boardLink}>See the board</Text>
          <ChevronRight size={18} color={colors.brand700} />
        </Pressable>
      ) : null}

      {paid ? <Steps booking={booking} /> : null}
      {booking.artwork && paid ? <ArtworkSection booking={booking} isAdvertiser={isAdvertiser} onChange={reload} /> : null}
      {printOptions?.open ? <PrintOffersSection bookingId={booking.id} options={printOptions} currency={booking.currency} onChange={reload} /> : null}
      {booking.plays && paid ? <PlaysSection plays={booking.plays} /> : null}
      {booking.proof && booking.artwork?.status === 'approved' ? <ProofSection bookingId={booking.id} proof={booking.proof} onChange={reload} /> : null}
      {booking.cancellation?.allowed ? <CancelPaid booking={booking} onChange={reload} /> : null}
      {booking.refunds?.length ? <Refunds booking={booking} /> : null}
      {booking.reviews ? <ReviewSection bookingId={booking.id} reviews={booking.reviews} onChange={reload} /> : null}
      {booking.dispute ? <DisputeSection bookingId={booking.id} disputes={booking.dispute} currency={booking.currency} onChange={reload} /> : null}
      <MessagesSection bookingId={booking.id} />
    </SettingsPage>
  )
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  days: { fontSize: 16, fontFamily: fonts.semibold, color: colors.ink900 },
  board: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: radius.xl, backgroundColor: colors.white, boxShadow: '0 1px 2px rgba(30,31,34,0.05), 0 8px 24px rgba(30,31,34,0.06)' },
  pressed: { backgroundColor: colors.surface100 },
  boardCover: { width: 84, height: 60, aspectRatio: undefined },
  boardLink: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.brand700 },
})
