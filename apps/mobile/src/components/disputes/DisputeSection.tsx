import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import type { BookingDisputes, DisputeReason, MessageSide } from '@greyboards/types'
import { Section } from '@/components/settings/SettingsPage'
import { Button, Callout, Input, Pill, Select, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { formatMoment, formatMoney } from '@/lib/format'
import { useAction } from '@/lib/use-action'
import { colors, fonts } from '@/theme'

const REASONS: { value: DisputeReason; label: string }[] = [
  { value: 'not_up', label: 'The ad isn’t up' },
  { value: 'wrong_ad', label: 'The wrong ad is up' },
  { value: 'damaged', label: 'The ad or board is damaged' },
  { value: 'taken_down', label: 'The ad came down early' },
  { value: 'payment', label: 'A problem with the money' },
  { value: 'other', label: 'Something else' },
]

const SIDES: Record<Exclude<MessageSide, 'staff'>, string> = { advertiser: 'Advertiser', board: 'Board’s side', dispatch: 'Dispatch' }

/** The booking's latest dispute and what staff decided, with a way to raise one when something went wrong. */
export function DisputeSection({ bookingId, disputes, currency, onChange }: { bookingId: string; disputes: BookingDisputes; currency: string; onChange: () => void }) {
  const action = useAction()
  const [raising, setRaising] = useState(false)
  const [reason, setReason] = useState<DisputeReason | ''>('')
  const [details, setDetails] = useState('')
  const { latest, canOpen } = disputes

  if (!latest && !canOpen) return null

  const raise = () =>
    action.run(async () => {
      await api.dispute(bookingId, { reason: reason as DisputeReason, details }).send()
      setRaising(false)
      onChange()

      return 'Dispute raised. Staff will look into it.'
    })

  return (
    <Section title={latest?.status === 'open' ? 'Dispute' : 'Something wrong?'}>
      {latest ? (
        <View style={styles.stack}>
          <View style={styles.line}>
            {latest.status === 'open' ? <Pill label="Waiting for staff" background={colors.amber50} color={colors.held} /> : <Pill label="Decided" background={colors.surface100} color={colors.ink700} />}
            <Text style={styles.strong}>{latest.reasonLabel}</Text>
          </View>
          <Text style={styles.body}>{latest.details}</Text>
          <Text variant="small">
            Raised by {latest.openedBy ?? 'someone'} ({SIDES[latest.side]}) · {formatMoment(latest.createdAt)}
          </Text>
          {latest.status === 'resolved' ? (
            <View style={styles.decision}>
              <Text style={styles.strong}>
                {latest.decisionLabel}
                {latest.refundMinor ? ` · ${formatMoney(latest.refundMinor, currency)} back` : ''}
              </Text>
              {latest.resolution ? <Text style={styles.body}>{latest.resolution}</Text> : null}
              {latest.resolvedAt ? <Text variant="small">{formatMoment(latest.resolvedAt)}</Text> : null}
            </View>
          ) : (
            <Text variant="small">Staff aim to decide within {disputes.answerHours} hours. Any money still held stays held until then.</Text>
          )}
        </View>
      ) : null}

      {canOpen && raising ? (
        <View style={styles.stack}>
          <Select label="What went wrong?" value={reason || 'pick'} options={[{ value: 'pick', label: 'What went wrong?' }, ...REASONS]} onChange={(value) => setReason(value === 'pick' ? '' : (value as DisputeReason))} />
          <Input value={details} onChangeText={setDetails} multiline maxLength={1000} accessibilityLabel="Details" placeholder="What happened, and when. Add photos in the messages." />
          <Button title="Raise dispute" loading={action.busy} disabled={!reason || details.trim().length < 10} onPress={raise} />
          <Button title="Not now" variant="ghost" onPress={() => setRaising(false)} />
        </View>
      ) : canOpen ? (
        <View style={styles.stack}>
          {!latest ? <Text variant="muted">Try the messages first. If you can’t sort it out between you, staff will look into it and decide.</Text> : null}
          <Button title="Raise a dispute" variant="secondary" onPress={() => setRaising(true)} />
        </View>
      ) : null}
      {action.problem.message ? <Callout>{action.problem.message}</Callout> : null}
    </Section>
  )
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  line: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  strong: { fontSize: 14, lineHeight: 20, fontFamily: fonts.semibold, color: colors.ink900 },
  body: { fontSize: 14, lineHeight: 20, color: colors.ink700 },
  decision: { gap: 4, padding: 14, borderRadius: 16, backgroundColor: colors.canvas },
})
