import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import type { Auction, AuctionStatus, Offer, OfferStatus } from '@greyboards/types'
import { ListRow } from '@/components/bookings/BookingBits'
import { Standing } from '@/components/reputation/Badges'
import { RatingLine } from '@/components/reviews/ReviewBits'
import { Button, Callout, Field, Input, Pill, type PillLook, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { formatDays, formatMoment, formatMoney, toMinor } from '@/lib/format'
import { useAction } from '@/lib/use-action'
import { colors } from '@/theme'

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
          {offer.can.accept ? <Button title={offer.status === 'countered' ? 'Accept the counter' : 'Accept'} loading={action.busy} onPress={accept} /> : null}
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

const styles = StyleSheet.create({
  from: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  counter: { gap: 10 },
})
