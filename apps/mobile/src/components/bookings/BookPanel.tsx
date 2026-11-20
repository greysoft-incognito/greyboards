import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { CalendarX2, MonitorPlay, ShieldCheck } from 'lucide-react-native'
import type { BoardDetail, BookedDays, Daypart, SlotQuote } from '@greyboards/types'
import { formatHeading, formatRate } from '@/components/boards/BoardBits'
import { Section } from '@/components/settings/SettingsPage'
import { Button, Callout, DateField, Field, Input, Select, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { OUTCOME_MESSAGES, payInBrowser } from '@/lib/checkout'
import { formatDays, formatMoney, plural, toMinor } from '@/lib/format'
import { toast } from '@/lib/toast'
import { useAction } from '@/lib/use-action'
import { colors, fonts, radius } from '@/theme'
import { Summary } from './BookingBits'

export const DAYPART_LABELS: Record<Daypart, string> = { all_day: 'All day', morning: 'Morning, 6 AM to noon', afternoon: 'Afternoon, noon to 6 PM', evening: 'Evening, 6 PM to midnight' }

/**
 * Picks the face, the first day and how long, and on a digital screen the slots and part of the day.
 * Shows the total, then holds the dates and opens the checkout, or sends an offer below the price instead.
 */
export function BookPanel({ board, taken, canBook, slotQuote }: { board: BoardDetail; taken: Record<string, BookedDays[]>; canBook: boolean; slotQuote: SlotQuote | null }) {
  const action = useAction()
  const terms = board.booking
  const digital = !!slotQuote
  const [faceId, setFaceId] = useState(board.rateCard[0]?.id ?? '')
  const face = board.rateCard.find((candidate) => candidate.id === faceId) ?? board.rateCard[0]
  const minPeriods = Math.min(face?.minPeriods ?? 1, terms.maxPeriods)
  const [periods, setPeriods] = useState(minPeriods)
  const [shares, setShares] = useState(1)
  const [slots, setSlots] = useState(1)
  const [daypart, setDaypart] = useState<Daypart>('all_day')
  const [offering, setOffering] = useState(false)
  const splitting = shares > 1 && !offering && !digital
  const [startsOn, setStartsOn] = useState(terms.earliestStart)
  const rate = board.rate && face?.rateMinor != null ? { ...board.rate, amountMinor: face.rateMinor } : board.rate
  const [amount, setAmount] = useState(() => (rate ? String(Math.floor((rate.amountMinor * periods * 0.9) / 100000) * 1000) : ''))
  const [note, setNote] = useState('')
  const days = taken[face?.id ?? ''] ?? []

  if (!terms.open || !rate) {
    return (
      <Section>
        <View style={styles.line}>
          <CalendarX2 size={18} color={colors.ink500} />
          <Text variant="muted" style={styles.flex}>
            {terms.reason ?? 'This board isn’t taking bookings yet.'}
          </Text>
        </View>
      </Section>
    )
  }

  const unit = rate.period
  const firstDay = splitting && startsOn < terms.shares.earliestStart ? terms.shares.earliestStart : startsOn
  const percent = slotQuote?.dayparts.find((part) => part.daypart === daypart)?.percent ?? 100
  const perPeriod = digital ? Math.round((rate.amountMinor * slots * percent) / 100) : rate.amountMinor
  const runPrice = perPeriod * periods
  const lengths = Array.from({ length: terms.maxPeriods - minPeriods + 1 }, (_, index) => minPeriods + index)

  const pickFace = (id: string) => {
    const next = board.rateCard.find((candidate) => candidate.id === id)

    setFaceId(id)
    setPeriods((current) => Math.max(current, Math.min(next?.minPeriods ?? 1, terms.maxPeriods)))
  }

  const book = () =>
    action.run(async () => {
      if (offering) {
        await api.makeOffer(board.id, { startsOn: firstDay, periods, faceId: face?.id, amountMinor: toMinor(amount), note: note.trim() || null }).send()
        router.push('/bookings')

        return 'Offer sent. You’ll see the owner’s reply under My offers.'
      }

      const { data: booking } = await api
        .bookBoard(board.id, { startsOn: firstDay, periods, faceId: face?.id, shares: splitting ? shares : 1, ...(digital ? { slots, daypart } : {}) })
        .send()

      if (splitting) {
        router.push({ pathname: '/bookings/[id]', params: { id: booking.id } })

        return 'Dates held. Send an invite link to each person.'
      }

      const { data: payment } = await api.checkout(booking.id).send()
      const outcome = await payInBrowser(payment)

      router.push({ pathname: '/bookings/[id]', params: { id: booking.id } })
      toast.show(OUTCOME_MESSAGES[outcome], outcome === 'failed' ? 'error' : 'success')
    })

  const rows = [
    { label: `${formatRate({ ...rate, amountMinor: perPeriod })} × ${periods}`, value: formatMoney(runPrice, rate.currency) },
    terms.printFeeMinor > 0
      ? { label: 'The owner prints and puts it up', value: formatMoney(terms.printFeeMinor, rate.currency) }
      : board.kind !== 'digital'
        ? { label: 'Printing and posting', value: 'Quoted by local dispatchers once your design is approved' }
        : null,
    splitting ? { label: 'Each share, about', value: formatMoney(Math.floor((runPrice + terms.printFeeMinor) / shares), rate.currency) } : null,
  ].filter((row) => row !== null)

  return (
    <Section title="Book this board" description={digital ? `Priced per slot, per ${unit}. Each loop has ${slotQuote.loop.slots} slots of ${slotQuote.loop.seconds} seconds.` : `Priced per ${unit}. Choose a start date and how long to run.`}>
      {canBook ? (
        <>
          {board.rateCard.length > 1 ? (
            <View style={styles.faces}>
              {board.rateCard.map((option) => {
                const chosen = option.id === face?.id

                return (
                  <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ checked: chosen }} onPress={() => pickFace(option.id)} style={[styles.face, chosen && styles.faceOn]}>
                    <Text style={styles.faceLabel}>{option.label}</Text>
                    <Text variant="small">
                      {option.rateMinor !== null && board.rate ? formatRate({ ...board.rate, amountMinor: option.rateMinor }) : 'No price yet'}
                      {option.headingDeg !== null ? ` · ${formatHeading(option.headingDeg)}` : ''}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          ) : null}

          <Field label="Start date">
            <DateField label="Start date" value={firstDay} min={splitting ? terms.shares.earliestStart : terms.earliestStart} taken={days} onChange={setStartsOn} />
          </Field>
          <Field label="How long">
            <Select label="How long" value={String(periods)} options={lengths.map((count) => ({ value: String(count), label: plural(count, unit) }))} onChange={(value) => setPeriods(Number(value))} />
          </Field>

          {digital ? (
            <>
              <Field label="Slots in the loop">
                <Select
                  label="Slots in the loop"
                  value={String(slots)}
                  options={Array.from({ length: slotQuote.loop.slots }, (_, index) => ({ value: String(index + 1), label: `${index + 1} of ${slotQuote.loop.slots}` }))}
                  onChange={(value) => setSlots(Number(value))}
                />
              </Field>
              <Field label="When it plays">
                <Select label="When it plays" value={daypart} options={slotQuote.dayparts.map((part) => ({ value: part.daypart, label: DAYPART_LABELS[part.daypart] }))} onChange={setDaypart} />
              </Field>
              <View style={styles.line}>
                <MonitorPlay size={16} color={colors.ink500} />
                <Text variant="small" style={styles.flex}>
                  Your ad plays for {slots * slotQuote.loop.seconds} seconds in every {slotQuote.loop.slots * slotQuote.loop.seconds}-second loop.
                </Text>
              </View>
            </>
          ) : null}

          {terms.shares.enabled && !offering && !digital ? (
            <Field label="Share the board">
              <Select
                label="Share the board"
                value={String(shares)}
                options={[{ value: '1', label: 'No, just my ad' }, ...Array.from({ length: terms.shares.max - 1 }, (_, index) => ({ value: String(index + 2), label: `With ${index + 2} advertisers in all` }))]}
                onChange={(value) => setShares(Number(value))}
              />
            </Field>
          ) : null}

          <Summary rows={rows} total={{ label: 'Total', value: formatMoney(runPrice + terms.printFeeMinor, rate.currency) }} />

          {offering ? (
            <View style={styles.offer}>
              <Field label="Your offer" hint={`Listed price ${formatMoney(rate.amountMinor * periods, rate.currency)}, before printing`}>
                <Input value={amount} onChangeText={setAmount} keyboardType="number-pad" />
              </Field>
              <Field label="Note for the owner">
                <Input value={note} onChangeText={setNote} multiline maxLength={500} placeholder="e.g. We’d like to run for three months if this goes well" />
              </Field>
            </View>
          ) : null}

          {action.problem.message ? <Callout>{action.problem.message}</Callout> : null}
          <Button confirm={offering
              ? { title: 'Send this offer to the owner?', action: 'Send offer' }
              : splitting
                ? { title: 'Hold these dates and invite others?', message: 'Everyone pays their share before the dates are booked.', action: 'Hold dates' }
                : { title: 'Hold these dates?', message: "Next, you'll pay to book them.", action: 'Hold dates' }}
            title={offering ? (action.busy ? 'Sending your offer…' : 'Send offer') : action.busy ? 'Holding your dates…' : splitting ? 'Hold dates and invite others' : 'Hold dates and pay'}
            size="lg"
            loading={action.busy}
            disabled={offering && !toMinor(amount)}
            onPress={book}
          />
          {!digital ? <Button title={offering ? 'Book at the listed price instead' : 'Make an offer instead'} variant="ghost" onPress={() => setOffering((current) => !current)} /> : null}
          <View style={styles.line}>
            <ShieldCheck size={16} color={colors.available} />
            <Text variant="small" style={styles.flex}>
              {offering
                ? 'The owner can accept, decline or suggest another price. If they accept, we’ll hold the dates for you to pay.'
                : splitting
                  ? `Each person pays their share and uploads their own design, and we combine them into one print. You’ll get an invite link for each share. Everyone has ${terms.shares.payHours} hours to pay, and you can cover any unpaid shares yourself.`
                  : 'We’ll hold your dates for a few minutes while you pay. The owner only gets paid once your ad is up.'}
            </Text>
          </View>
        </>
      ) : (
        <Button title="Become an advertiser to book" onPress={() => router.push('/settings/roles')} />
      )}

      {days.length ? (
        <View style={styles.taken}>
          <Text style={styles.faceLabel}>{board.rateCard.length > 1 && face ? `Not free on ${face.label}` : 'Not free'}</Text>
          {days.slice(0, 6).map((run) => (
            <Text key={`${run.startsOn}-${run.auction ? 'bids' : run.blocked ? 'kept' : 'booked'}`} variant="small">
              {formatDays(run)} · {run.auction ? 'open for bids' : run.blocked ? 'kept by the owner' : digital ? 'every slot booked' : 'booked'}
            </Text>
          ))}
        </View>
      ) : null}
    </Section>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  faces: { gap: 8 },
  face: { padding: 12, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.surface200, gap: 2 },
  faceOn: { borderColor: colors.brand500, backgroundColor: colors.brand50 },
  faceLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink900 },
  offer: { gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: colors.brand200 },
  taken: { gap: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.surface100 },
})
