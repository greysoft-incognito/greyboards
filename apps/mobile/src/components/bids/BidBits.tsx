import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Gavel, Timer } from 'lucide-react-native'
import type { Auction, AuctionStatus, Offer, OfferStatus } from '@greyboards/types'
import { ListRow } from '@/components/bookings/BookingBits'
import { Standing } from '@/components/reputation/Badges'
import { RatingLine } from '@/components/reviews/ReviewBits'
import { Section } from '@/components/settings/SettingsPage'
import { Button, Callout, Field, Input, Pill, type PillLook, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { formatDays, formatMoment, formatMoney, toMinor } from '@/lib/format'
import { useAction } from '@/lib/use-action'
import { colors, fonts } from '@/theme'

export const AUCTION_LOOKS: Record<AuctionStatus, PillLook> = {
  open: { label: 'Taking bids', background: colors.brand50, color: colors.brand700 },
  awarded: { label: 'Won, waiting for payment', background: colors.amber50, color: colors.held },
  sold: { label: 'Sold', background: colors.emerald50, color: colors.available },
  unsold: { label: 'Not sold', background: colors.surface100, color: colors.ink500 },
  cancelled: { label: 'Closed early', background: colors.surface100, color: colors.ink500 },
}

const OFFER_LOOKS: Record<OfferStatus, PillLook> = {
  pending: { label: 'Waiting for an answer', background: colors.amber50, color: colors.held },
  countered: { label: 'Countered', background: colors.brand50, color: colors.brand700 },
  accepted: { label: 'Accepted', background: colors.emerald50, color: colors.available },
  declined: { label: 'Declined', background: colors.surface100, color: colors.ink500 },
  withdrawn: { label: 'Withdrawn', background: colors.surface100, color: colors.ink500 },
  expired: { label: 'Lapsed', background: colors.surface100, color: colors.ink500 },
}

/** An offer in a list, with the answers the viewer can give. `onBoards` is for offers made on the viewer's boards. */
export function OfferRow({ offer, onBoards, onChange }: { offer: Offer; onBoards: boolean; onChange: () => void }) {
  const action = useAction()
  const [countering, setCountering] = useState(false)
  const [counter, setCounter] = useState('')

  const answer = (task: () => Promise<string | null | undefined>) =>
    action.run(async () => {
      const message = await task()

      onChange()

      return message
    })

  const accept = () =>
    answer(async () => {
      const { data, message } = await api.acceptOffer(offer.id).send()

      if (!onBoards) router.push({ pathname: '/bookings/[id]', params: { id: data.id } })

      return message ?? 'Offer accepted.'
    })

  return (
    <ListRow
      board={offer.board}
      badge={<Pill {...OFFER_LOOKS[offer.status]} />}
      days={`${formatDays(offer)}${offer.face ? ` · ${offer.face.label}` : ''}`}
      amount={formatMoney(offer.counterMinor ?? offer.amountMinor, offer.currency)}
      amountLabel={offer.counterMinor !== null ? `offered ${formatMoney(offer.amountMinor, offer.currency)}` : `listed ${formatMoney(offer.listMinor, offer.currency)}`}
    >
      {onBoards && offer.advertiser ? (
        <View style={styles.from}>
          <Text variant="muted">From {offer.advertiser.name}</Text>
          <RatingLine rating={offer.advertiser.rating} />
          <Standing standing={offer.advertiser.standing} compact />
        </View>
      ) : null}
      {offer.note ? <Text variant="muted">“{offer.note}”</Text> : null}

      {offer.can.accept || offer.can.decline || offer.can.withdraw || offer.can.counter ? (
        <View style={styles.actions}>
          {offer.can.accept ? <Button title={offer.status === 'countered' ? 'Accept their price' : 'Accept'} loading={action.busy} onPress={accept} /> : null}
          {offer.can.counter && !countering ? <Button title="Counter" variant="secondary" onPress={() => setCountering(true)} /> : null}
          {offer.can.decline ? <Button title="Decline" variant="ghost" disabled={action.busy} onPress={() => answer(async () => (await api.declineOffer(offer.id).send()).message ?? 'Offer declined.')} /> : null}
          {offer.can.withdraw ? <Button title="Withdraw" variant="ghost" disabled={action.busy} onPress={() => answer(async () => (await api.withdrawOffer(offer.id).send()).message ?? 'Offer withdrawn.')} /> : null}
        </View>
      ) : null}
      {offer.bookingId && !onBoards && offer.status === 'accepted' ? <Button title="Pay to book" onPress={() => router.push({ pathname: '/bookings/[id]', params: { id: offer.bookingId! } })} /> : null}
      {offer.status === 'pending' || offer.status === 'countered' ? <Text variant="small">Lapses {formatMoment(offer.expiresAt)}</Text> : null}

      {countering ? (
        <View style={styles.counter}>
          <Field label="What you'd take" hint={`Between ${formatMoney(offer.amountMinor, offer.currency)} and ${formatMoney(offer.listMinor, offer.currency)}`}>
            <Input value={counter} onChangeText={setCounter} keyboardType="number-pad" placeholder={String(Math.round((offer.amountMinor + offer.listMinor) / 200))} />
          </Field>
          <View style={styles.actions}>
            <Button
              title="Send counter"
              loading={action.busy}
              disabled={!counter}
              onPress={() =>
                answer(async () => {
                  const { message } = await api.counterOffer(offer.id, toMinor(counter)).send()

                  setCountering(false)

                  return message ?? 'Counter sent.'
                })
              }
            />
            <Button title="Cancel" variant="ghost" onPress={() => setCountering(false)} />
          </View>
        </View>
      ) : null}
      {action.problem.message ? <Callout>{action.problem.message}</Callout> : null}
    </ListRow>
  )
}

/** An auction the account bid on, in its list of bids. */
export function BidRow({ auction }: { auction: Auction }) {
  const mine = auction.myBid
  const won = mine?.status === 'won'

  return (
    <ListRow
      board={auction.board}
      badge={<Pill {...(won ? { label: auction.status === 'sold' ? 'Won and paid' : 'You won, pay now', background: colors.emerald50, color: colors.available } : AUCTION_LOOKS[auction.status])} />}
      days={`${formatDays(auction)} · ${auction.open ? 'closes' : 'closed'} ${formatMoment(auction.closesAt)}`}
      amount={mine ? formatMoney(mine.amountMinor, auction.currency) : ''}
      amountLabel={mine?.leading ? 'highest bid' : auction.highestMinor !== null ? `highest ${formatMoney(auction.highestMinor, auction.currency)}` : 'your bid'}
      to={won && mine?.bookingId ? { pathname: '/bookings/[id]', params: { id: mine.bookingId } } : auction.board ? { pathname: '/boards/[id]', params: { id: auction.board.id } } : undefined}
    />
  )
}

/** Dates a board’s owner opened for bids: the highest bid, the viewer's own, and a field to bid or raise. */
export function AuctionCard({ auction, canBid, onChange }: { auction: Auction; canBid: boolean; onChange: () => void }) {
  const action = useAction()
  const minimum = auction.nextMinimumMinor ?? auction.reserveMinor
  const [amount, setAmount] = useState(String(minimum / 100))
  const mine = auction.myBid
  const facts = [
    { label: `Dates${auction.face ? ` on ${auction.face.label}` : ''}`, value: formatDays(auction) },
    { label: auction.open ? 'Closes' : 'Closed', value: formatMoment(auction.closesAt) },
    { label: 'Highest bid', value: auction.highestMinor !== null ? formatMoney(auction.highestMinor, auction.currency) : auction.format === 'sealed' ? 'Hidden until bidding ends' : 'No bids yet' },
    { label: 'Reserve', value: `${formatMoney(auction.reserveMinor, auction.currency)} · ${auction.bidCount} ${auction.bidCount === 1 ? 'bid' : 'bids'}` },
  ]

  const bid = () =>
    action.run(async () => {
      const { message } = await api.bid(auction.id, toMinor(amount)).send()

      onChange()

      return message ?? 'Bid placed.'
    })

  return (
    <Section>
      <View style={styles.head}>
        <View style={styles.title}>
          <Gavel size={20} color={colors.brand600} />
          <Text style={styles.heading}>Open for bids</Text>
        </View>
        <Pill {...AUCTION_LOOKS[auction.status]} />
      </View>
      <View style={styles.facts}>
        {facts.map((fact) => (
          <View key={fact.label} style={styles.fact}>
            <Text variant="small">{fact.label}</Text>
            <Text style={styles.factValue}>{fact.value}</Text>
          </View>
        ))}
      </View>

      {mine ? (
        <View style={styles.mine}>
          <Text>
            Your bid: <Text style={styles.factValue}>{formatMoney(mine.amountMinor, auction.currency)}</Text>
            {mine.status === 'won' ? '. You won.' : mine.status === 'lapsed' ? '. It wasn’t paid in time, so the dates went to the next bid.' : mine.leading ? '. You’re the highest bidder.' : auction.open && auction.format === 'open' ? '. Someone bid more.' : '.'}
          </Text>
          {mine.status === 'won' && mine.bookingId ? <Button title="Pay to book the dates" onPress={() => router.push({ pathname: '/bookings/[id]', params: { id: mine.bookingId! } })} /> : null}
        </View>
      ) : null}

      {auction.open ? (
        canBid ? (
          <>
            <Field label="Your bid" hint={`At least ${formatMoney(minimum, auction.currency)}`}>
              <Input value={amount} onChangeText={setAmount} keyboardType="number-pad" />
            </Field>
            {action.problem.message ? <Callout>{action.problem.message}</Callout> : null}
            <Button title={mine ? 'Raise my bid' : 'Place bid'} loading={action.busy} disabled={toMinor(amount) < minimum} onPress={bid} />
            <View style={styles.note}>
              <Timer size={16} color={colors.ink500} />
              <Text variant="small" style={styles.flex}>
                A bid in the last few minutes keeps bidding open a little longer. The winner has a day to pay.
              </Text>
            </View>
          </>
        ) : (
          <Button title="Add the advertiser role to bid" variant="secondary" onPress={() => router.push('/settings/roles')} />
        )
      ) : null}
    </Section>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heading: { fontFamily: fonts.display, fontSize: 18, color: colors.ink900 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  fact: { width: '50%', gap: 2, paddingRight: 8 },
  factValue: { fontFamily: fonts.semibold, color: colors.ink900 },
  mine: { gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.surface100 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  flex: { flex: 1 },
  from: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  counter: { gap: 10 },
})
