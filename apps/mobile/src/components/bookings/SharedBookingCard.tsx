import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { Gavel, Lock, UsersRound } from 'lucide-react-native'
import type { SharedBooking } from '@greyboards/types'
import { Section } from '@/components/settings/SettingsPage'
import { Button, Callout, Field, Input, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { payAndReport } from '@/lib/checkout'
import { formatDay, formatMoment, formatMoney, toMinor } from '@/lib/format'
import { useAction } from '@/lib/use-action'
import { colors, fonts, radius } from '@/theme'

/** What the viewer sees of the bidding for the whole board. */
function biddingNote(shared: SharedBooking) {
  const auction = shared.auction
  const mine = auction?.myBid

  if (!auction) {
    return `No longer locked. The whole board is open to bids from ${formatMoney(shared.amountMinor, shared.currency)} until ${formatMoment(shared.bidsCloseAt)}. If the winner pays, the sharers get their money back.`
  }

  const highest = auction.highestMinor !== null ? `Highest bid ${formatMoney(auction.highestMinor, auction.currency)}` : 'Bids stay hidden until bidding ends'

  if (auction.status === 'awarded') {
    return mine?.status === 'won' ? `You won the whole board! Pay by ${auction.payBy ? formatMoment(auction.payBy) : 'the deadline'} to keep it.` : 'Bidding closed. The winner is paying for the whole board.'
  }

  const yours = mine ? (mine.leading ? ' You’re the highest bidder.' : auction.format === 'open' ? ' You’ve been outbid.' : '') : ''

  return `The whole board is up for bids: ${highest} from ${auction.bidCount} ${auction.bidCount === 1 ? 'bid' : 'bids'}, closing ${formatMoment(auction.closesAt)}.${yours} If every share gets paid first, the sharers keep it.`
}

/**
 * A shared booking anyone can join: the days, what a share costs and how many are left. Once
 * its lock ends with shares unpaid, the whole board goes up for bids, from the full price.
 */
export function SharedBookingCard({ shared, showBoard = false, canJoin, onChange }: { shared: SharedBooking; showBoard?: boolean; canJoin: boolean; onChange: () => void }) {
  const action = useAction()
  const auction = shared.auction
  const minimum = auction?.nextMinimumMinor ?? shared.amountMinor
  const [amount, setAmount] = useState(String(minimum / 100))
  const won = auction?.status === 'awarded' && auction.myBid?.status === 'won'
  const bidding = shared.takeoverOpen || !!auction

  const join = () =>
    action.run(async () => {
      await api.joinShare(shared.id).send()
      router.push({ pathname: '/bookings/[id]', params: { id: shared.id } })

      return 'A share is yours. Pay it while the dates are held.'
    })

  const bid = () =>
    action.run(async () => {
      const { message } = await api.bidToTake(shared.id, toMinor(amount)).send()

      onChange()

      return message ?? 'Bid placed for the whole board.'
    })

  return (
    <Section>
      <View style={styles.head}>
        <View style={styles.icon}>
          <UsersRound size={20} color={colors.brand700} />
        </View>
        <View style={styles.flex}>
          {showBoard && shared.board ? (
            <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/boards/[id]', params: { id: shared.board!.id } })}>
              <Text style={styles.board} numberOfLines={1}>
                {shared.board.name}
              </Text>
            </Pressable>
          ) : null}
          <Text style={styles.days}>
            Shared {formatDay(shared.startsOn)} to {formatDay(shared.endsOn)}
          </Text>
          <Text variant="muted">
            {shared.openCount} of {shared.count} shares left{shared.organiser ? `, started by ${shared.organiser}` : ''}. Everyone’s design is merged into one print.
          </Text>
        </View>
      </View>

      <View style={styles.line}>
        {bidding ? <Gavel size={16} color={colors.brand600} /> : <Lock size={16} color={colors.ink500} />}
        <Text variant="small" style={styles.flex}>
          {bidding ? biddingNote(shared) : `Kept for the sharers until ${formatMoment(shared.lockedUntil)}. After that, the whole board goes up for bids if shares are still unpaid.`}
        </Text>
      </View>

      {shared.joined ? (
        <Button title="You’re sharing this. See the booking" variant="ghost" onPress={() => router.push({ pathname: '/bookings/[id]', params: { id: shared.id } })} />
      ) : canJoin ? (
        <>
          {shared.shareAmountMinor !== null ? <Button confirm={{ title: `Join for ${formatMoney(shared.shareAmountMinor!, shared.currency)}?`, message: "Your design goes on the board with everyone else's.", action: "Join" }} title={`Join for ${formatMoney(shared.shareAmountMinor, shared.currency)}`} loading={action.busy} onPress={join} /> : null}
          {won && auction?.myBid ? (
            <Button confirm={{ title: "Pay for the whole board?", action: "Pay" }}
              title={`Pay ${formatMoney(auction.myBid.amountMinor, auction.currency)} for the whole board`}
              loading={action.busy}
              onPress={() => action.run(() => payAndReport(() => api.payTakeover(shared.id).send(), onChange))}
            />
          ) : null}
          {shared.takeoverOpen ? (
            <View style={styles.bid}>
              <Field label="Bid for the whole board" hint={`At least ${formatMoney(minimum, shared.currency)}`}>
                <Input value={amount} onChangeText={setAmount} keyboardType="number-pad" />
              </Field>
              <Button confirm={{ title: "Bid for the whole board?", message: "If you win, the board is yours alone for these dates.", action: "Bid" }} title={auction?.myBid ? 'Raise my bid' : 'Place bid'} variant="secondary" loading={action.busy} disabled={toMinor(amount) < minimum} onPress={bid} />
            </View>
          ) : null}
        </>
      ) : null}

      {action.problem.message ? <Callout>{action.problem.message}</Callout> : null}
    </Section>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand50 },
  board: { fontFamily: fonts.display, fontSize: 18, color: colors.ink900 },
  days: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink900 },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bid: { gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.surface200 },
})
