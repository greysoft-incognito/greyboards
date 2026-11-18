import { type ReactNode, useEffect, useState } from 'react'
import { Pressable, StyleSheet, Switch, View } from 'react-native'
import { HandCoins, Sparkles } from 'lucide-react-native'
import type { BoardDetail, BoardInput, BoardKind, BoardKindDefinition, BoardRatePeriod, PriceGuide, RoadClass } from '@greyboards/types'
import { HeadingPicker } from '@/components/boards/HeadingPicker'
import { Section } from '@/components/settings/SettingsPage'
import { Field, Input, Select, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import type { Spot } from '@/lib/location'
import { colors, fonts, radius } from '@/theme'

type Errors = Record<string, string | undefined>

/** "12" or "12.5" as a number, or null while it isn't one. */
export const decimal = (value: string) => (value.trim() && Number.isFinite(Number(value)) ? Number(value) : null)

const text = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value))

/** A board's details as the form holds them: text, so a half-typed number stays put. */
export function blankFields(board?: BoardDetail) {
  const ownerMinor = board?.ownerNet && board.ownerRateMinor != null ? board.ownerRateMinor : board?.rate?.amountMinor

  return {
    name: board?.name ?? '',
    kind: board?.kind ?? ('billboard' as BoardKind),
    widthM: text(board?.widthM),
    heightM: text(board?.heightM),
    faces: String(board?.faces ?? 1),
    lit: board?.lit ? '1' : '0',
    roadClass: board?.roadClass ?? '',
    dailyTraffic: text(board?.measuredTraffic),
    loopSlots: text(board?.ownLoopSlots),
    slotSeconds: text(board?.ownSlotSeconds),
    facing: board?.facing ?? '',
    heading: board?.headingDeg ?? null,
    description: board?.description ?? '',
    address: board?.address ?? '',
    city: board?.city ?? '',
    rate: ownerMinor ? String(ownerMinor / 100) : '',
    ratePeriod: board?.rate?.period ?? ('month' as BoardRatePeriod),
    ownerNet: board?.ownerNet ?? false,
    printsOwn: board?.printsOwn ?? false,
    printFee: board?.ownPrintFeeMinor ? String(board.ownPrintFeeMinor / 100) : '',
  }
}

export type BoardFieldValues = ReturnType<typeof blankFields>

/** The fields as the API takes them, placed at `spot`. */
export function boardInput(fields: BoardFieldValues, spot: Spot, country = 'NG'): BoardInput {
  const rate = decimal(fields.rate)
  const printFee = decimal(fields.printFee)

  return {
    name: fields.name.trim(),
    description: fields.description.trim() || null,
    kind: fields.kind,
    widthM: decimal(fields.widthM) ?? 0,
    heightM: decimal(fields.heightM) ?? 0,
    faces: Number(fields.faces),
    lit: fields.lit === '1',
    roadClass: (fields.roadClass || null) as RoadClass | null,
    dailyTraffic: decimal(fields.dailyTraffic),
    facing: fields.facing.trim() || null,
    headingDeg: fields.heading,
    address: fields.address.trim() || null,
    city: fields.city.trim() || null,
    country,
    latitude: spot.latitude,
    longitude: spot.longitude,
    accuracyM: spot.accuracyM,
    rateMinor: rate === null ? null : Math.round(rate * 100),
    ratePeriod: fields.ratePeriod,
    ownerNet: fields.ownerNet,
    printsOwn: fields.printsOwn,
    printFeeMinor: printFee === null ? null : Math.round(printFee * 100),
    ...(fields.kind === 'digital' ? { loopSlots: decimal(fields.loopSlots), slotSeconds: decimal(fields.slotSeconds) } : {}),
  }
}

/** Form state for a board, with a setter per field. */
export function useBoardFields(board?: BoardDetail) {
  const [fields, setFields] = useState(() => blankFields(board))
  const set =
    <K extends keyof BoardFieldValues>(key: K) =>
    (value: BoardFieldValues[K]) =>
      setFields((current) => ({ ...current, [key]: value }))

  return { fields, set }
}

type FieldsProps = { fields: BoardFieldValues; set: ReturnType<typeof useBoardFields>['set']; errors: Errors }

/** What the board is: its name, kind, size, faces, lighting, road and, on a screen, its loop. */
export function BoardDetailsSection({ fields, set, errors, kinds, board }: FieldsProps & { kinds: BoardKindDefinition[]; board?: BoardDetail }) {
  return (
    <Section title="The board">
      <Field label="Name" error={errors.name} hint="What advertisers see first. A landmark helps.">
        <Input value={fields.name} onChangeText={set('name')} maxLength={120} placeholder="Ahmadu Bello Way, facing Murtala Square" />
      </Field>
      <Field label="Kind" error={errors.kind}>
        <Select label="Kind" value={fields.kind} onChange={set('kind')} options={(kinds.length ? kinds : [{ kind: 'billboard' as BoardKind, label: 'Billboard' }]).map((kind) => ({ value: kind.kind, label: kind.label }))} />
      </Field>
      <View style={styles.pair}>
        <View style={styles.flex}>
          <Field label="Width (m)" error={errors.widthM}>
            <Input value={fields.widthM} onChangeText={set('widthM')} keyboardType="decimal-pad" placeholder="12" />
          </Field>
        </View>
        <View style={styles.flex}>
          <Field label="Height (m)" error={errors.heightM}>
            <Input value={fields.heightM} onChangeText={set('heightM')} keyboardType="decimal-pad" placeholder="4" />
          </Field>
        </View>
      </View>
      <View style={styles.pair}>
        <View style={styles.flex}>
          <Field label="Faces">
            <Select label="Faces" value={fields.faces} onChange={set('faces')} options={['1', '2', '3', '4'].map((faces) => ({ value: faces, label: faces === '1' ? 'One face' : `${faces} faces` }))} />
          </Field>
        </View>
        <View style={styles.flex}>
          <Field label="Lighting">
            <Select label="Lighting" value={fields.lit} onChange={set('lit')} options={[{ value: '0', label: 'Not lit' }, { value: '1', label: 'Lit at night' }]} />
          </Field>
        </View>
      </View>
      <Field label="The road it faces" error={errors.roadClass} hint="Gives advertisers a traffic estimate.">
        <Select
          label="The road it faces"
          value={fields.roadClass}
          onChange={set('roadClass')}
          options={[
            { value: '', label: 'Not sure' },
            { value: 'expressway', label: 'Expressway or highway' },
            { value: 'major', label: 'Major road' },
            { value: 'street', label: 'Busy street' },
            { value: 'local', label: 'Quiet street' },
          ]}
        />
      </Field>
      <Field label="People passing a day" error={errors.dailyTraffic} hint="Only if someone counted them.">
        <Input value={fields.dailyTraffic} onChangeText={set('dailyTraffic')} keyboardType="number-pad" placeholder="25000" />
      </Field>
      {fields.kind === 'digital' ? (
        <View style={styles.pair}>
          <View style={styles.flex}>
            <Field label="Slots in the loop" error={errors.loopSlots} hint="Leave empty for the standard loop.">
              <Input value={fields.loopSlots} onChangeText={set('loopSlots')} keyboardType="number-pad" placeholder={board?.loop ? String(board.loop.slots) : '6'} />
            </Field>
          </View>
          <View style={styles.flex}>
            <Field label="Seconds per slot" error={errors.slotSeconds} hint="Leave empty for the standard length.">
              <Input value={fields.slotSeconds} onChangeText={set('slotSeconds')} keyboardType="number-pad" placeholder={board?.loop ? String(board.loop.seconds) : '10'} />
            </Field>
          </View>
        </View>
      ) : null}
      <Field label="Direction it faces" error={errors.headingDeg}>
        <HeadingPicker value={fields.heading} onChange={set('heading')} />
      </Field>
      <Field label="Facing" error={errors.facing} hint="Which traffic sees it.">
        <Input value={fields.facing} onChangeText={set('facing')} maxLength={60} placeholder="Traffic to Ajah" />
      </Field>
      <Field label="Notes" error={errors.description}>
        <Input value={fields.description} onChangeText={set('description')} multiline maxLength={1000} placeholder="Anything an advertiser should know, such as trees in the way or a nearby junction." />
      </Field>
    </Section>
  )
}

/**
 * The rate, with a suggested price from boards like it nearby, the owner's fixed amount, and
 * who prints. `children` go at the end, such as the owner picker while scouting.
 */
export function RateSection({
  fields,
  set,
  errors,
  spot,
  percent,
  scouting = false,
  exceptId,
  children,
}: FieldsProps & { spot: Spot | null; percent: number | null; scouting?: boolean; exceptId?: string; children?: ReactNode }) {
  const digital = fields.kind === 'digital'

  // The guide is for the listed price; with the owner's amount fixed, the field takes the owner's part of it.
  const useGuide = (listedMinor: number) => set('rate')(String(Math.round((fields.ownerNet && percent ? Math.floor((listedMinor * percent) / 100) : listedMinor) / 100)))

  return (
    <Section title={scouting ? 'Owner and rate' : 'Rate'}>
      <View style={styles.pair}>
        <View style={styles.flex}>
          <Field
            label={fields.ownerNet ? 'Owner gets, in naira' : digital ? 'Rate per slot, in naira' : 'Rate in naira'}
            error={errors.rateMinor}
            hint={fields.ownerNet ? 'Each period, after every other share.' : scouting ? 'What the owner asks, if you know.' : undefined}
          >
            <Input value={fields.rate} onChangeText={set('rate')} keyboardType="number-pad" placeholder="850000" />
          </Field>
        </View>
        <View style={styles.flex}>
          <Field label="Per">
            <Select label="Per" value={fields.ratePeriod} onChange={set('ratePeriod')} options={[{ value: 'month', label: 'Month' }, { value: 'week', label: 'Week' }]} />
          </Field>
        </View>
      </View>
      <PriceGuideBox fields={fields} spot={spot} exceptId={exceptId} onUse={useGuide} />
      <OwnerNetToggle on={fields.ownerNet} onChange={set('ownerNet')} rate={fields.rate} percent={percent} />
      <Field label="Who prints and puts up ads" error={errors.printsOwn}>
        <Select
          label="Who prints and puts up ads"
          value={fields.printsOwn ? '1' : '0'}
          onChange={(value) => set('printsOwn')(value === '1')}
          options={[
            { value: '0', label: 'A Greyboards dispatcher' },
            { value: '1', label: scouting ? 'The owner or I do it' : 'We do it ourselves' },
          ]}
        />
      </Field>
      {fields.printsOwn ? (
        <Field label="Your print price in naira" error={errors.printFeeMinor} hint="Leave empty for the standard price.">
          <Input value={fields.printFee} onChangeText={set('printFee')} keyboardType="number-pad" placeholder="150000" />
        </Field>
      ) : null}
      {children}
    </Section>
  )
}

/**
 * A suggested rate under the rate field: the range listed boards of the same kind nearby ask,
 * scaled to this board's size, or what its traffic is worth when too few are near.
 */
function PriceGuideBox({ fields, spot, exceptId, onUse }: { fields: BoardFieldValues; spot: Spot | null; exceptId?: string; onUse: (listedMinor: number) => void }) {
  const [guide, setGuide] = useState<PriceGuide | null>(null)
  const widthM = decimal(fields.widthM)
  const heightM = decimal(fields.heightM)
  const dailyTraffic = decimal(fields.dailyTraffic)

  useEffect(() => {
    if (!spot || !widthM || !heightM) return setGuide(null)

    let current = true
    const timer = setTimeout(() => {
      api.account
        .priceGuide({
          lat: spot.latitude,
          lng: spot.longitude,
          kind: fields.kind,
          widthM,
          heightM,
          period: fields.ratePeriod,
          ...(fields.roadClass ? { roadClass: fields.roadClass as RoadClass } : {}),
          ...(dailyTraffic !== null ? { dailyTraffic } : {}),
          ...(exceptId ? { except: exceptId } : {}),
        })
        .send()
        .then(({ data }) => current && setGuide(data))
        .catch(() => current && setGuide(null))
    }, 500)

    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [spot, widthM, heightM, dailyTraffic, fields.kind, fields.ratePeriod, fields.roadClass, exceptId])

  if (!guide || guide.suggestedMinor === null) return null

  const comparables = guide.comparables
  const basis =
    guide.basis === 'comparables' && comparables
      ? `${comparables.count} boards like this within ${comparables.radiusKm} km ask ${formatMoney(comparables.lowMinor ?? 0)} to ${formatMoney(comparables.highMinor ?? 0)} for this size.${guide.fromTrafficMinor !== null ? ` Its traffic alone suggests ${formatMoney(guide.fromTrafficMinor)}.` : ''}`
      : `From about ${guide.traffic?.daily.toLocaleString('en-NG')} people passing a day${guide.traffic?.source === 'measured' ? ', as counted' : ''}.`

  return (
    <View style={styles.guide} accessibilityRole="summary">
      <Sparkles size={18} color={colors.brand600} />
      <View style={styles.flex}>
        <Text variant="label">
          Suggested: {formatMoney(guide.suggestedMinor)} a {guide.period}
        </Text>
        <Text variant="small">{basis}</Text>
        <Pressable accessibilityRole="button" onPress={() => onUse(guide.suggestedMinor!)} hitSlop={6}>
          <Text style={styles.use}>Use this price</Text>
        </Pressable>
      </View>
    </View>
  )
}

const naira = (amount: number) => `₦${Math.round(amount).toLocaleString('en-NG')}`

/**
 * Lets the tagger fix what the owner receives. The rate typed is then the owner's amount, and
 * the listed rate adds the other shares on top: the same rounding the API uses, up to a naira.
 */
function OwnerNetToggle({ on, onChange, rate, percent }: { on: boolean; onChange: (on: boolean) => void; rate: string; percent: number | null }) {
  const amount = Number(rate.replace(/[^\d.]/g, ''))
  const typed = rate.trim() !== '' && Number.isFinite(amount) && amount > 0
  const listed = typed && percent !== null && percent > 0 && percent < 100 ? Math.ceil((amount * 100) / percent) : null

  return (
    <View style={styles.ownerNet}>
      <View style={styles.ownerNetRow}>
        <HandCoins size={18} color={colors.brand600} />
        <View style={styles.flex}>
          <Text variant="label">The owner gets exactly this amount</Text>
          <Text variant="small">The platform and scout shares go on top instead of coming out of it.</Text>
        </View>
        <Switch value={on} onValueChange={onChange} trackColor={{ true: colors.brand500, false: colors.surface300 }} thumbColor={colors.white} accessibilityLabel="The owner gets exactly this amount" />
      </View>
      {typed && percent !== null ? (
        <Text variant="small" style={styles.ownerNetPreview}>
          {on && listed !== null
            ? `Listed at ${naira(listed)}. The owner gets ${naira(amount)}, which is ${percent}% of the rent.`
            : `Listed at ${naira(amount)}. The owner gets ${naira(Math.floor((amount * percent) / 100))}, which is ${percent}% of the rent.`}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pair: { flexDirection: 'row', gap: 12 },
  guide: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: radius.lg, backgroundColor: colors.brand50 },
  use: { marginTop: 4, fontSize: 14, fontFamily: fonts.semibold, color: colors.brand700 },
  ownerNet: { gap: 10, borderWidth: 1.5, borderColor: colors.surface200, borderRadius: radius.lg, padding: 12 },
  ownerNetRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ownerNetPreview: { backgroundColor: colors.surface100, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 8, overflow: 'hidden', color: colors.ink700 },
})
