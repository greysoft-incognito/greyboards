import { useCallback, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { CalendarDays, ShieldCheck, UsersRound } from 'lucide-react-native'
import type { ShareInvite } from '@greyboards/types'
import { BoardCover } from '@/components/boards/BoardBits'
import { Summary } from '@/components/bookings/BookingBits'
import { Section, SettingsPage } from '@/components/settings/SettingsPage'
import { Button, Callout, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { payAndReport } from '@/lib/checkout'
import { FormProblem } from '@/lib/forms'
import { formatDays, formatMoney, formatWait } from '@/lib/format'
import { useUser } from '@/lib/session'
import { useAction } from '@/lib/use-action'
import { colors, fonts, radius } from '@/theme'

/** An invite to share a booking's cost: the board, the dates, and what this share costs. Taking it goes straight to paying. */
export default function ShareInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const canBook = useUser().accountRoles.some((role) => role.kind === 'advertiser' && role.status === 'active')
  const action = useAction()
  const [invite, setInvite] = useState<ShareInvite | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  const load = useCallback(() => {
    api
      .shareInvite(token)
      .send()
      .then(({ data }) => setInvite(data))
      .catch((error) => setProblem(FormProblem.from(error).message))
  }, [token])

  useFocusEffect(load)

  if (!invite) {
    return <SettingsPage title="Join a shared booking">{problem ? <Callout>{problem}</Callout> : <ActivityIndicator color={colors.brand600} />}</SettingsPage>
  }

  const booking = invite.booking
  const left = invite.payBy ? Math.max(0, Math.floor((new Date(invite.payBy).getTime() - Date.now()) / 1000)) : 0
  const payable = (invite.open || (invite.mine && invite.status === 'claimed')) && left > 0
  const seeBooking = () => router.replace({ pathname: '/bookings/[id]', params: { id: booking.id } })

  const pay = () =>
    action.run(async () => {
      if (!invite.mine) await api.claimShare(token).send()

      const message = await payAndReport(() => api.checkout(booking.id).send(), load)

      seeBooking()

      return message
    })

  return (
    <SettingsPage title={booking.board?.name ?? 'Shared booking'}>
      <Section>
        {booking.board ? <BoardCover board={booking.board} style={styles.cover} /> : null}
        <View style={styles.line}>
          <UsersRound size={16} color={colors.brand700} />
          <Text style={styles.lead}>
            {invite.organiser ?? 'An advertiser'} is splitting this booking {invite.count} ways
          </Text>
        </View>
        <View style={styles.line}>
          <CalendarDays size={16} color={colors.ink500} />
          <Text variant="muted">
            {formatDays(booking)}
            {booking.face ? ` · ${booking.face.label}` : ''}
          </Text>
        </View>
        <Summary rows={[{ label: 'Whole booking', value: formatMoney(booking.amountMinor, booking.currency) }]} total={{ label: 'This share', value: formatMoney(invite.amountMinor, invite.currency) }} />

        {action.problem.message ? <Callout>{action.problem.message}</Callout> : null}

        {payable && canBook ? (
          <>
            <Button confirm={{ title: invite.mine ? 'Pay your share?' : 'Join and pay your share?', action: 'Pay' }} title={invite.mine ? 'Pay my share' : 'Join and pay my share'} size="lg" loading={action.busy} onPress={pay} />
            <View style={styles.line}>
              <ShieldCheck size={16} color={colors.available} />
              <Text variant="small" style={styles.flex}>
                Everyone has {formatWait(left)} to pay. If the booking doesn’t go ahead, you’ll get a full refund.
              </Text>
            </View>
          </>
        ) : payable ? (
          <Button title="Become an advertiser to join" onPress={() => router.push('/settings/roles')} />
        ) : (
          <>
            <Text>
              {invite.mine && invite.status === 'paid' ? 'Your share is paid.' : !invite.mine && invite.status !== 'open' ? 'Someone already took this share.' : 'This booking is already closed.'}
            </Text>
            {invite.mine ? <Button title="See the booking" variant="ghost" onPress={seeBooking} /> : null}
          </>
        )}
      </Section>
    </SettingsPage>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cover: { height: 160, borderRadius: radius.lg },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lead: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.brand700 },
})
