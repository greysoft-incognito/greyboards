import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { CalendarOff, Gavel, Layers, X } from 'lucide-react-native'
import { type Auction, type BoardDetail, type BoardFace, currencySymbol } from '@greyboards/types'
import { AUCTION_LOOKS } from '@/components/bids/BidBits'
import { formatHeading } from '@/components/boards/BoardBits'
import { Section } from '@/components/settings/SettingsPage'
import { Button, Callout, DateField, Field, Input, Pill, Select, Text } from '@/components/ui'
import { ask } from '@/lib/confirm'
import { api } from '@/lib/api'
import { formatDays, formatMoment, formatMoney, plural, toMinor } from '@/lib/format'
import { useAction } from '@/lib/use-action'
import { colors, fonts, radius } from '@/theme'

type OnChange = () => void

/** Today as 'YYYY-MM-DD' in UTC, the way the calendar counts days. */
const today = () => new Date().toISOString().slice(0, 10)

/** A section heading with its icon. */
function Heading({ icon: Icon, title, text }: { icon: typeof Layers; title: string; text: string }) {
  return (
    <View style={styles.heading}>
      <View style={styles.headingRow}>
        <Icon size={20} color={colors.brand600} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text variant="muted">{text}</Text>
    </View>
  )
}

/** Edit the board's details, or remove it with its photos once the owner is sure. */
export function BoardActions({ board }: { board: BoardDetail }) {
  const action = useAction()
  const [sure, setSure] = useState(false)

  const remove = () =>
    action.run(async () => {
      await api.account.removeBoard(board.id).send()
      router.replace('/boards')

      return 'Board removed.'
    })

  return (
    <View style={styles.actions}>
      {sure ? (
        <>
          <Button title="Remove this board and its photos" variant="danger" loading={action.busy} onPress={remove} />
          <Button title="Keep it" variant="ghost" onPress={() => setSure(false)} />
        </>
      ) : (
        <>
          <Button title="Edit" variant="secondary" onPress={() => router.push({ pathname: '/boards/edit/[id]', params: { id: board.id } })} />
          <Button title="Remove" variant="ghost" onPress={() => setSure(true)} />
        </>
      )}
      {action.problem.message ? <Callout>{action.problem.message}</Callout> : null}
    </View>
  )
}

/** Each face's name and rate card. An empty rate uses the board's. */
export function RateCard({ board, onChange }: { board: BoardDetail; onChange: OnChange }) {
  const unit = board.rate?.period ?? 'month'

  return (
    <Section>
      <Heading icon={Layers} title="Sides and rates" text="Each side is booked separately. Leave a rate empty to use the board’s main rate." />
      {board.rateCard.map((face) => (
        <FaceForm key={face.id} boardId={board.id} face={face} unit={unit} currency={board.currency} onChange={onChange} />
      ))}
    </Section>
  )
}

function FaceForm({ boardId, face, unit, currency, onChange }: { boardId: string; face: BoardFace; unit: string; currency: string; onChange: OnChange }) {
  const action = useAction()
  const [label, setLabel] = useState(face.label)
  const [rate, setRate] = useState(face.ownRateMinor === null ? '' : String(face.ownRateMinor / 100))
  const [minPeriods, setMinPeriods] = useState(String(face.minPeriods))
  const errors = action.problem.fields

  const save = () =>
    action.run(async () => {
      await api.account.updateBoardFace(boardId, face.id, { label: label.trim(), rateMinor: rate.trim() === '' ? null : toMinor(rate), minPeriods: Number(minPeriods) }).send()
      onChange()

      return `${label.trim()} saved.`
    })

  return (
    <View style={styles.inset}>
      <Field label="Name" error={errors.label} hint={face.headingDeg !== null ? formatHeading(face.headingDeg) : undefined}>
        <Input value={label} onChangeText={setLabel} maxLength={40} />
      </Field>
      <View style={styles.pair}>
        <View style={styles.flex}>
          <Field label={`Rate per ${unit}`} error={errors.rateMinor} hint={face.ownRateMinor === null && face.rateMinor !== null ? `Board's: ${formatMoney(face.rateMinor, currency)}` : undefined}>
            <Input value={rate} onChangeText={setRate} keyboardType="number-pad" placeholder="Board's rate" />
          </Field>
        </View>
        <View style={styles.flex}>
          <Field label="Shortest booking" error={errors.minPeriods}>
            <Select label="Shortest booking" value={minPeriods} onChange={setMinPeriods} options={Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: plural(index + 1, unit) }))} />
          </Field>
        </View>
      </View>
      {action.problem.summary ? <Callout>{action.problem.summary}</Callout> : null}
      <Button title={`Save ${face.label}`} variant="secondary" loading={action.busy} disabled={!label.trim()} onPress={save} />
    </View>
  )
}

/** The face picker shared by blocked days and auctions, shown only when there's more than one. */
function FacePick({ board, value, onChange, whole }: { board: BoardDetail; value: string; onChange: (id: string) => void; whole?: boolean }) {
  if (board.rateCard.length < 2) return null

  return (
    <Field label="Which face">
      <Select label="Which face" value={value} onChange={onChange} options={[...(whole ? [{ value: '', label: 'Whole board' }] : []), ...board.rateCard.map((face) => ({ value: face.id, label: face.label }))]} />
    </Field>
  )
}

/** Days the owner keeps for their own clients, on one face or the whole board. */
export function BlockedDays({ board, onChange }: { board: BoardDetail; onChange: OnChange }) {
  const action = useAction()
  const [startsOn, setStartsOn] = useState(today())
  const [endsOn, setEndsOn] = useState(today())
  const [faceId, setFaceId] = useState('')
  const [note, setNote] = useState('')
  const blocks = board.blocks ?? []
  const faceLabel = (id: string | null) => (id ? (board.rateCard.find((face) => face.id === id)?.label ?? 'One face') : 'Whole board')

  const block = () =>
    action.run(async () => {
      const { message } = await api.account.blockDays(board.id, { startsOn, endsOn, faceId: faceId || null, note: note.trim() || null }).send()

      setNote('')
      onChange()

      return message ?? 'Days blocked.'
    })

  const unblock = (id: string) =>
    action.run(async () => {
      await api.account.unblockDays(board.id, id).send()
      onChange()

      return 'Those days can be booked again.'
    })

  return (
    <Section>
      <Heading icon={CalendarOff} title="Blocked days" text="Save days for your own clients. Advertisers won’t be able to book them." />
      {blocks.length ? (
        <View style={styles.list}>
          {blocks.map((entry) => (
            <View key={entry.id} style={styles.listRow}>
              <View style={styles.flex}>
                <Text style={styles.strong}>{formatDays(entry)}</Text>
                <Text variant="small">{[faceLabel(entry.faceId), entry.note].filter(Boolean).join(' · ')}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Open these days again" hitSlop={6} disabled={action.busy} onPress={() => unblock(entry.id)} style={styles.close}>
                <X size={16} color={colors.ink500} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      <View style={styles.pair}>
        <View style={styles.flex}>
          <Field label="Start date">
            <DateField label="Start date" value={startsOn} min={today()} onChange={(day) => (setStartsOn(day), day > endsOn && setEndsOn(day))} />
          </Field>
        </View>
        <View style={styles.flex}>
          <Field label="Last day">
            <DateField label="Last day" value={endsOn} min={startsOn} onChange={setEndsOn} />
          </Field>
        </View>
      </View>
      <FacePick board={board} value={faceId} onChange={setFaceId} whole />
      <Field label="Private note">
        <Input value={note} onChangeText={setNote} maxLength={191} placeholder="Such as: our own client" />
      </Field>
      {action.problem.message ? <Callout>{action.problem.message}</Callout> : null}
      <Button confirm={{ title: "Block these days?", message: "Nobody can book them until you open them again.", action: "Block" }} title="Block these days" variant="secondary" loading={action.busy} onPress={block} />
    </Section>
  )
}

const HOURS = Array.from({ length: 24 }, (_, hour) => ({ value: String(hour), label: new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: true, timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 1, hour))) }))

/** Open some dates to bids instead of the fixed price, and close the ones nobody bid on yet. */
export function AuctionsManager({ board, auctions, onChange }: { board: BoardDetail; auctions: Auction[]; onChange: OnChange }) {
  const action = useAction()
  const unit = board.rate?.period ?? 'month'
  const [faceId, setFaceId] = useState(board.rateCard[0]?.id ?? '')
  const [startsOn, setStartsOn] = useState(board.booking.earliestStart)
  const [periods, setPeriods] = useState('1')
  const [reserve, setReserve] = useState('')
  const [closesOn, setClosesOn] = useState(today())
  const [closesHour, setClosesHour] = useState('18')
  const errors = action.problem.fields

  const open = () =>
    action.run(async () => {
      // Hours are picked in Nigerian time, an hour ahead of UTC.
      const closesAt = new Date(`${closesOn}T${closesHour.padStart(2, '0')}:00:00+01:00`).toISOString()

      await api.account.openAuction(board.id, { faceId: faceId || null, startsOn, periods: Number(periods), reserveMinor: toMinor(reserve), closesAt }).send()
      setReserve('')
      onChange()

      return 'Bidding is open.'
    })

  const cancel = (id: string) =>
    action.run(async () => {
      await api.account.cancelAuction(id).send()
      onChange()

      return 'Bidding closed. The dates can be booked again.'
    })

  return (
    <Section>
      <Heading icon={Gavel} title="Bids" text="Let advertisers bid on some dates. The highest bid above your minimum wins." />
      {auctions.length ? (
        <View style={styles.list}>
          {auctions.map((auction) => (
            <View key={auction.id} style={styles.listRow}>
              <View style={[styles.flex, styles.gap]}>
                <Pill {...AUCTION_LOOKS[auction.status]} />
                <Text style={styles.strong}>
                  {formatDays(auction)}
                  {auction.face && board.rateCard.length > 1 ? ` · ${auction.face.label}` : ''}
                </Text>
                <Text variant="small">
                  {auction.highestMinor !== null ? `Highest ${formatMoney(auction.highestMinor, auction.currency)}` : 'No minimum set'} · {plural(auction.bidCount, 'bid')} · {auction.open ? 'closes' : 'closed'}{' '}
                  {formatMoment(auction.closesAt)}
                </Text>
              </View>
              {auction.status === 'open' && auction.bidCount === 0 ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Close the bidding" hitSlop={6} disabled={action.busy} onPress={async () => (await ask({ title: 'Close the bidding?', action: 'Close it', danger: true })) && cancel(auction.id)} style={styles.close}>
                  <X size={16} color={colors.ink500} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
      <FacePick board={board} value={faceId} onChange={setFaceId} />
      <View style={styles.pair}>
        <View style={styles.flex}>
          <Field label="Start date" error={errors.startsOn}>
            <DateField label="Start date" value={startsOn} min={board.booking.earliestStart} onChange={setStartsOn} />
          </Field>
        </View>
        <View style={styles.flex}>
          <Field label="How long" error={errors.periods}>
            <Select label="How long" value={periods} onChange={setPeriods} options={Array.from({ length: board.booking.maxPeriods }, (_, index) => ({ value: String(index + 1), label: plural(index + 1, unit) }))} />
          </Field>
        </View>
      </View>
      <Field label="Reserve" error={errors.reserveMinor} hint={`Minimum price for the whole period, in ${currencySymbol(board.currency)}.`}>
        <Input value={reserve} onChangeText={setReserve} keyboardType="number-pad" placeholder="500000" />
      </Field>
      <View style={styles.pair}>
        <View style={styles.flex}>
          <Field label="Bidding closes" error={errors.closesAt}>
            <DateField label="Bidding closes" value={closesOn} min={today()} onChange={setClosesOn} />
          </Field>
        </View>
        <View style={styles.flex}>
          <Field label="At">
            <Select label="At" value={closesHour} onChange={setClosesHour} options={HOURS} />
          </Field>
        </View>
      </View>
      {action.problem.summary ? <Callout>{action.problem.summary}</Callout> : null}
      <Button confirm={{ title: "Open these dates for bids?", message: "Advertisers can bid until it closes.", action: "Open for bids" }} title="Open for bids" variant="secondary" loading={action.busy} disabled={!toMinor(reserve)} onPress={open} />
    </Section>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 4 },
  heading: { gap: 4 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: fonts.display, fontSize: 18, color: colors.ink900 },
  actions: { gap: 8 },
  inset: { gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface100 },
  pair: { flexDirection: 'row', gap: 12 },
  list: { borderRadius: radius.lg, backgroundColor: colors.surface100, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.surface200 },
  strong: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink900 },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
})
