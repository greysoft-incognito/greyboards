import { useCallback, useState } from 'react'
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { CalendarSearch } from 'lucide-react-native'
import type { Auction, Booking, Offer } from '@greyboards/types'
import { BidRow, OfferRow } from '@/components/bids/BidBits'
import { BookingRow } from '@/components/bookings/BookingBits'
import { EmptyState } from '@/components/EmptyState'
import { useTabBarInset } from '@/components/GlassTabBar'
import { Button, Callout, Chip, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { formatMoney } from '@/lib/format'
import { useUser } from '@/lib/session'
import { colors } from '@/theme'

type View_ = 'mine' | 'boards' | 'offers' | 'board-offers' | 'bids'

type Entry = { type: 'booking'; booking: Booking } | { type: 'offer'; offer: Offer } | { type: 'bid'; auction: Auction }

const INTROS: Record<View_, string> = {
  mine: "Boards you've booked. Payments wait in escrow until your ad is up.",
  boards: 'Paid bookings on boards you look after, and what each one pays.',
  offers: 'Offers you made below a board’s price. Once accepted, the dates are held for you to pay.',
  'board-offers': 'Offers advertisers made on your boards. Accept, decline or name your price.',
  bids: 'Dates you bid for. If you win, you have a day to pay.',
}

const EMPTY: Record<View_, { title: string; text: string }> = {
  mine: { title: 'No bookings yet', text: 'Find a board, pick your dates and pay. We hold the money until your ad is up.' },
  boards: { title: 'No paid bookings yet', text: 'When an advertiser pays for one of your boards, it shows here with what it pays.' },
  offers: { title: 'No offers yet', text: 'On a board, choose Make an offer to suggest your own price for the dates.' },
  'board-offers': { title: 'No offers yet', text: 'When an advertiser offers less than your price, it shows here for you to answer.' },
  bids: { title: 'No bids yet', text: 'Boards with dates open for bids show them on their page. Bid there.' },
}

/** Fetches one page of a view, as list entries. */
async function fetchPage(view: View_, page: number) {
  if (view === 'offers' || view === 'board-offers') {
    const result = await (view === 'offers' ? api.account.offers({ page }) : api.account.boardOffers({ page })).send()

    return { entries: result.data.map((offer): Entry => ({ type: 'offer', offer })), meta: result.meta }
  }

  if (view === 'bids') {
    const result = await api.account.bids({ page }).send()

    return { entries: result.data.map((auction): Entry => ({ type: 'bid', auction })), meta: result.meta }
  }

  const result = await (view === 'boards' ? api.account.boardBookings({ page }) : api.account.bookings({ page })).send()

  return { entries: result.data.map((booking): Entry => ({ type: 'booking', booking })), meta: result.meta }
}

/** Bookings the account made, its offers and bids, and for owners and scouts the bookings and offers on their boards. */
export default function Bookings() {
  const inset = useTabBarInset()
  const looksAfterBoards = useUser().accountRoles.some((role) => (role.kind === 'owner' || role.kind === 'scout') && role.status === 'active')
  const [view, setView] = useState<View_>('mine')
  const [entries, setEntries] = useState<Entry[]>([])
  const [page, setPage] = useState({ current: 0, last: 1 })
  const [loading, setLoading] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const views: { view: View_; label: string }[] = [
    { view: 'mine', label: 'My bookings' },
    ...(looksAfterBoards ? [{ view: 'boards' as const, label: 'On my boards' }] : []),
    { view: 'offers', label: 'My offers' },
    ...(looksAfterBoards ? [{ view: 'board-offers' as const, label: 'Offers to me' }] : []),
    { view: 'bids', label: 'My bids' },
  ]

  const load = useCallback(
    async (next: number) => {
      setLoading(true)
      setProblem(null)

      try {
        const result = await fetchPage(view, next)

        setEntries((shown) => (next === 1 ? result.entries : [...shown, ...result.entries]))
        setPage({ current: result.meta.current_page, last: result.meta.last_page })
      } catch (error) {
        setProblem(FormProblem.from(error).message)
      } finally {
        setLoading(false)
      }
    },
    [view],
  )

  useFocusEffect(
    useCallback(() => {
      load(1)
    }, [load]),
  )

  const pick = (next: View_) => {
    setEntries([])
    setView(next)
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={[styles.page, { paddingBottom: 32 + inset }, !entries.length && styles.grow]}
      data={entries}
      keyExtractor={(entry) => (entry.type === 'booking' ? entry.booking.id : entry.type === 'offer' ? entry.offer.id : entry.auction.id)}
      renderItem={({ item }) =>
        item.type === 'booking' ? (
          <BookingRow booking={item.booking} amountLabel={view === 'boards' && item.booking.split ? `owner gets ${formatMoney(item.booking.split.ownerAmountMinor, item.booking.currency)}` : undefined} />
        ) : item.type === 'offer' ? (
          <OfferRow offer={item.offer} onBoards={view === 'board-offers'} onChange={() => load(1)} />
        ) : (
          <BidRow auction={item.auction} />
        )
      }
      onEndReached={() => !loading && page.current < page.last && load(page.current + 1)}
      onEndReachedThreshold={0.4}
      refreshControl={<RefreshControl refreshing={loading && page.current <= 1} onRefresh={() => load(1)} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text variant="display">Bookings</Text>
          <Text variant="muted">{INTROS[view]}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.views}>
            {views.map((entry) => (
              <Chip key={entry.view} label={entry.label} selected={entry.view === view} onPress={() => pick(entry.view)} />
            ))}
          </ScrollView>
          {problem ? <Callout>{problem}</Callout> : null}
        </View>
      }
      ListEmptyComponent={
        loading ? undefined : (
          <EmptyState icon={CalendarSearch} title={EMPTY[view].title} text={EMPTY[view].text}>
            {view === 'mine' || view === 'offers' || view === 'bids' ? <Button title="Find a board" onPress={() => router.navigate('/find')} /> : null}
          </EmptyState>
        )
      }
    />
  )
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.canvas },
  page: { padding: 16, gap: 12 },
  grow: { flexGrow: 1 },
  header: { gap: 8, marginBottom: 4 },
  views: { gap: 8, paddingVertical: 6 },
})
