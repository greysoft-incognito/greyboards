import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { ChevronRight, MapPin } from 'lucide-react-native'
import { type DispatchRate, type PrintOffer, currencySymbol } from '@greyboards/types'
import { Section, SettingsPage } from '@/components/settings/SettingsPage'
import { Button, Callout, Field, Input, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { useCurrency } from '@/lib/currency'
import { FormProblem } from '@/lib/forms'
import { formatDay, formatMoney, toMinor } from '@/lib/format'
import { currentSpot } from '@/lib/location'
import { useAction } from '@/lib/use-action'
import { colors, fonts } from '@/theme'

const OFFER_LABELS: Record<PrintOffer['status'], string> = {
  requested: 'Requested at your rate',
  pending: 'Waiting for advertiser',
  paid: 'Paid, it’s yours',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
  closed: 'Closed',
}

/** What a dispatcher charges and where they work, with their prices and the requests made to them. */
export default function Prices() {
  const [rate, setRate] = useState<DispatchRate | null>(null)
  const [offers, setOffers] = useState<PrintOffer[]>([])
  const [page, setPage] = useState({ current: 0, last: 1 })
  const [problem, setProblem] = useState<string | null>(null)
  const more = useAction()

  const load = useCallback(async () => {
    try {
      const [own, list] = await Promise.all([api.printJobs.rate().send(), api.printJobs.offers().send()])

      setRate(own.data)
      setOffers(list.data)
      setPage({ current: list.meta.current_page, last: list.meta.last_page })
    } catch (error) {
      setProblem(FormProblem.from(error).message)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const loadMore = () =>
    more.run(async () => {
      const list = await api.printJobs.offers({ page: page.current + 1 }).send()

      setOffers((shown) => [...shown, ...list.data])
      setPage({ current: list.meta.current_page, last: list.meta.last_page })
    })

  return (
    <SettingsPage title="Your prices" description="Advertisers near you can hire you at this rate. You can also send your own quote on any job.">
      {problem ? <Callout>{problem}</Callout> : null}
      {rate ? <RateForm key={String(rate.saved)} rate={rate} onSaved={setRate} /> : problem ? null : <ActivityIndicator color={colors.brand600} />}

      <Section title="Quotes and requests">
        {offers.length ? (
          offers.map((offer) => (
            <Pressable
              key={offer.id}
              accessibilityRole="link"
              onPress={() => (offer.job ? router.push({ pathname: '/jobs/[id]', params: { id: offer.job.id } }) : router.navigate('/jobs'))}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.flex}>
                <Text style={styles.strong} numberOfLines={1}>
                  {offer.job?.boardName ?? 'A job'}
                </Text>
                {offer.job ? <Text variant="small">Up by {formatDay(offer.job.dueOn)}</Text> : null}
              </View>
              <View style={styles.right}>
                <Text style={styles.strong}>{formatMoney(offer.amountMinor, offer.currency)}</Text>
                <Text variant="small">{OFFER_LABELS[offer.status]}</Text>
              </View>
              <ChevronRight size={18} color={colors.ink500} />
            </Pressable>
          ))
        ) : (
          <Text variant="muted">No quotes yet. Send one on any job near you, or wait for an advertiser to reach out.</Text>
        )}
        {page.current < page.last ? <Button title="Show more" variant="ghost" loading={more.busy} onPress={loadMore} /> : null}
      </Section>
    </SettingsPage>
  )
}

function RateForm({ rate, onSaved }: { rate: DispatchRate; onSaved: (rate: DispatchRate) => void }) {
  const action = useAction()
  const locate = useAction()
  const [perSqm, setPerSqm] = useState(String(rate.pricePerSqmMinor / 100))
  const [minFee, setMinFee] = useState(rate.minFeeMinor ? String(rate.minFeeMinor / 100) : '')
  const [radiusKm, setRadiusKm] = useState(String(rate.radiusKm))
  const [note, setNote] = useState(rate.note ?? '')
  const [base, setBase] = useState(rate.latitude !== null && rate.longitude !== null ? { latitude: rate.latitude, longitude: rate.longitude } : null)
  const errors = action.problem.fields
  const symbol = currencySymbol(useCurrency().currency)

  const findMe = () =>
    locate.run(async () => {
      const spot = await currentSpot()

      setBase({ latitude: spot.latitude, longitude: spot.longitude })
    })

  const save = () =>
    action.run(async () => {
      if (!base) return

      const { data } = await api.printJobs
        .saveRate({ pricePerSqmMinor: toMinor(perSqm), minFeeMinor: toMinor(minFee) || 0, latitude: base.latitude, longitude: base.longitude, radiusKm: Number(radiusKm), note: note.trim() || null })
        .send()

      onSaved(data)

      return 'Your prices are saved.'
    })

  return (
    <Section title="Your rate" description={rate.saved ? undefined : 'Set your rate and location so advertisers can find you.'}>
      <Field label={`Per square metre, in ${symbol}`} error={errors.pricePerSqmMinor} hint="In the currency of the boards near your base.">
        <Input value={perSqm} onChangeText={setPerSqm} keyboardType="number-pad" />
      </Field>
      <Field label={`Minimum charge, in ${symbol}`} error={errors.minFeeMinor} hint="Optional. The least you’ll charge for a small board.">
        <Input value={minFee} onChangeText={setMinFee} keyboardType="number-pad" />
      </Field>
      <Field label="Your base" error={errors.latitude ?? errors.longitude}>
        <View style={styles.base}>
          <MapPin size={18} color={base ? colors.brand600 : colors.ink500} />
          <Text style={styles.flex}>{base ? `${base.latitude.toFixed(5)}, ${base.longitude.toFixed(5)}` : 'Not set yet'}</Text>
        </View>
      </Field>
      {locate.problem.message ? <Callout>{locate.problem.message}</Callout> : null}
      <Button title={locate.busy ? 'Finding your location…' : 'Use my location'} variant="secondary" loading={locate.busy} onPress={findMe} />
      <Field label="How far you’ll travel, in km" error={errors.radiusKm}>
        <Input value={radiusKm} onChangeText={setRadiusKm} keyboardType="number-pad" />
      </Field>
      <Field label="Note for advertisers" error={errors.note} hint="Optional. For example, the materials you use.">
        <Input value={note} onChangeText={setNote} maxLength={200} />
      </Field>
      {action.problem.summary ? <Callout>{action.problem.summary}</Callout> : null}
      <Button title="Save" loading={action.busy} disabled={!base || !toMinor(perSqm) || !Number(radiusKm)} onPress={save} />
    </Section>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.surface100 },
  pressed: { opacity: 0.7 },
  right: { alignItems: 'flex-end' },
  strong: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink900 },
  base: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
})
