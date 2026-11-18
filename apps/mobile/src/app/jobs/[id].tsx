import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { Linking, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import { CalendarClock, MapPin, Ruler } from 'lucide-react-native'
import { type PrintJob, currencySymbol } from '@greyboards/types'
import { BoardCover, boardPlace, formatSize } from '@/components/boards/BoardBits'
import { JobStatusBadge, formatDay, formatDistance, formatMoney } from '@/components/jobs/JobBits'
import { MessagesSection } from '@/components/messages/MessagesSection'
import { ProofSection } from '@/components/proofs/ProofSection'
import { Section, SettingsPage } from '@/components/settings/SettingsPage'
import { Button, Callout, Field, Input, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem, PlainProblem } from '@/lib/forms'
import { megabytes, useLimits } from '@/lib/limits'
import { uploadFile } from '@/lib/upload-file'
import { useAction } from '@/lib/use-action'
import { colors, radius } from '@/theme'

/** Send a price on a job nobody has paid for, or answer the advertiser's request at your rate. */
function SendPrice({ job, onChange }: { job: PrintJob; onChange: () => void }) {
  const action = useAction()
  const offer = job.myOffer
  const [amount, setAmount] = useState(offer ? String(offer.amountMinor / 100) : '')
  const [note, setNote] = useState(offer?.note ?? '')

  const act = (task: () => Promise<unknown>, message: string) =>
    action.run(async () => {
      await task()
      onChange()

      return message
    })

  if (offer?.status === 'requested') {
    return (
      <Section title="Asked at your rate">
        <Text>The advertiser asked you to do this job for {formatMoney(offer.amountMinor, offer.currency)}. The job is yours once they pay.</Text>
        <Button title="Accept" loading={action.busy} onPress={() => act(() => api.printJobs.acceptRequest(offer.id).send(), 'Accepted. The job is yours once the advertiser pays.')} />
        <Button title="Decline" variant="ghost" disabled={action.busy} onPress={() => act(() => api.printJobs.declineRequest(offer.id).send(), 'Request declined.')} />
      </Section>
    )
  }

  const send = () => {
    const price = Number(amount.replace(/[^\d.]/g, ''))

    if (!price) return action.run(async () => { throw new PlainProblem('Enter your price.') })

    return act(() => api.printJobs.sendPrice(job.id, Math.round(price * 100), note.trim() || null).send(), 'Price sent. The job is yours if the advertiser pays it.')
  }

  return (
    <Section title={offer ? 'Your price' : 'Send your price'}>
      {offer?.status === 'pending' ? <Text variant="muted">{formatMoney(offer.amountMinor, offer.currency)} is with the advertiser. The job is yours if they pay it.</Text> : null}
      <Field label={`Price in ${currencySymbol(job.currency)}`}>
        <Input value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="175000" />
      </Field>
      <Field label="Note for the advertiser" hint="Optional, such as the material.">
        <Input value={note} onChangeText={setNote} maxLength={200} />
      </Field>
      <Button title={offer ? 'Change price' : 'Send price'} loading={action.busy} onPress={send} />
      {offer?.status === 'pending' ? <Button title="Take it back" variant="ghost" disabled={action.busy} onPress={() => act(() => api.printJobs.withdrawPrice(offer.id).send(), 'Price taken back.')} /> : null}
      <Text variant="small">Include printing, transport and putting it up by {formatDay(job.dueOn)}. Set your rate on the web under Print jobs › Prices so advertisers can ask you.</Text>
    </Section>
  )
}

/** One print job: where and how big, the pay, the artwork, and the next thing to do. */
export default function JobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [job, setJob] = useState<PrintJob | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  const load = useCallback(() => {
    api.printJobs
      .show(id)
      .send()
      .then(({ data }) => setJob(data))
      .catch((error) => setProblem(FormProblem.from(error).message))
  }, [id])

  useFocusEffect(load)

  if (!job) {
    return (
      <SettingsPage title="Print job">
        {problem ? <Callout>{problem}</Callout> : <Text variant="muted">Loading…</Text>}
      </SettingsPage>
    )
  }

  const board = job.board
  const directions = board ? `https://www.google.com/maps/dir/?api=1&destination=${board.latitude},${board.longitude}` : null

  return (
    <SettingsPage title={board?.name ?? 'Print job'}>
      <JobStatusBadge status={job.status} />

      <View style={styles.sections}>
        {board ? <BoardCover board={board} /> : null}

        <Section>
          {board ? <Line icon={MapPin} text={`${boardPlace(board)}${job.distanceM !== null ? ` · ${formatDistance(job.distanceM)} away` : ''}`} /> : null}
          {board ? <Line icon={Ruler} text={`${board.kindLabel}, ${formatSize(board)}${board.faces > 1 ? `, ${board.faces} faces` : ''}`} /> : null}
          <Line icon={CalendarClock} text={`Up by ${formatDay(job.dueOn)}`} />
          {job.priced ? (
            <View style={styles.pay}>
              <Text variant="muted" style={styles.flex}>
                You earn, once the ad is up
              </Text>
              <Text variant="title">{formatMoney(job.feeMinor, job.currency)}</Text>
            </View>
          ) : null}
          {directions ? (
            <Button title="Directions to the board" variant="secondary" onPress={() => Linking.openURL(directions).catch(() => undefined)} />
          ) : null}
        </Section>

        <NextStep job={job} onChange={load} />

        {job.mine && job.bookingId && job.proof && ['printed', 'posted'].includes(job.status) ? <ProofSection bookingId={job.bookingId} proof={job.proof} onChange={load} /> : null}

        {job.mine && job.artworkUrl ? (
          <Section title="Artwork to print">
            {job.bookedDays ? (
              <Text variant="muted">
                It runs {formatDay(job.bookedDays.startsOn)} to {formatDay(job.bookedDays.endsOn)}.
              </Text>
            ) : null}
            <View style={styles.artwork}>
              <Image source={{ uri: job.artworkUrl }} style={StyleSheet.absoluteFill} contentFit="contain" transition={150} />
            </View>
            <Button title="Open full size" variant="ghost" onPress={() => Linking.openURL(job.artworkUrl!).catch(() => undefined)} />
          </Section>
        ) : null}

        {job.mine && job.bookingId ? <MessagesSection bookingId={job.bookingId} /> : null}

        {job.printPhotoUrl ? (
          <Section title="Your print photo">
            <View style={styles.artwork}>
              <Image source={{ uri: job.printPhotoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
            </View>
          </Section>
        ) : null}
      </View>
    </SettingsPage>
  )
}

/** What the dispatcher does next: reserve, confirm, show the print, then put it up. */
function NextStep({ job, onChange }: { job: PrintJob; onChange: () => void }) {
  const { maxImageMb } = useLimits()
  const action = useAction()

  const act = (task: () => Promise<unknown>, message: string) =>
    action.run(async () => {
      await task()
      onChange()

      return message
    })

  const printPhoto = () =>
    action.run(async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync()

      if (!permission.granted) throw new PlainProblem('Allow the camera for Greyboards in your phone settings to photograph the print.')

      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 })

      if (result.canceled) return

      const asset = result.assets[0]!

      if (asset.fileSize && asset.fileSize > megabytes(maxImageMb)) throw new PlainProblem(`That photo is larger than ${maxImageMb} MB.`)

      await api.printJobs.printPhoto(job.id, uploadFile(asset)).send()
      onChange()

      return 'Print photo added.'
    })

  const giveBack = <Button title="Give it back" variant="ghost" disabled={action.busy} onPress={() => act(() => api.printJobs.release(job.id).send(), 'Job given back.')} />

  let body: ReactNode = null

  if (job.status === 'open' && !job.priced) return <SendPrice job={job} onChange={onChange} />

  if (job.status === 'open') {
    body = (
      <>
        <Button title={action.busy ? 'Reserving…' : 'Reserve this job'} loading={action.busy} onPress={() => act(() => api.printJobs.reserve(job.id).send(), 'Held for you. Confirm once you know you can make the date.')} />
        <Text variant="small">The last dispatcher missed this job, so it’s open again at the price already paid. Reserve it and we’ll hold it for you for a few hours while you check the date.</Text>
      </>
    )
  } else if (job.mine && job.status === 'reserved') {
    body = (
      <>
        {job.reservedUntil ? <HoldLeft until={job.reservedUntil} /> : null}
        <Button title={action.busy ? 'Confirming…' : 'I can do it'} loading={action.busy} onPress={() => act(() => api.printJobs.confirm(job.id).send(), 'The job is yours.')} />
        {giveBack}
      </>
    )
  } else if (job.mine && job.status === 'confirmed') {
    body = (
      <>
        <Text variant="muted">Print the artwork, then photograph the finished print before you put it up.</Text>
        <Button title={action.busy ? 'Uploading…' : 'Take the print photo'} loading={action.busy} onPress={printPhoto} />
        {giveBack}
      </>
    )
  } else if (job.mine && job.status === 'printed') {
    body = <Text variant="muted">Printed. Put it up by {formatDay(job.dueOn)}, then take the proof photos below while you’re at the board.</Text>
  } else if (job.mine && job.status === 'posted') {
    body = <Text variant="muted">Posted. You’re paid once the advertiser accepts your photos.</Text>
  }

  if (!body) return null

  return (
    <Section title="Next">
      {body}
      {action.problem.message ? <Callout>{action.problem.message}</Callout> : null}
    </Section>
  )
}

function HoldLeft({ until }: { until: string }) {
  const minutesLeft = () => Math.max(0, Math.round((new Date(until).getTime() - Date.now()) / 60_000))
  const [left, setLeft] = useState(minutesLeft)

  useEffect(() => {
    const timer = setInterval(() => setLeft(minutesLeft()), 30_000)

    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [until])

  const hours = Math.floor(left / 60)

  return <Text variant="muted">{left > 0 ? `Held for you for ${hours ? `${hours} h ` : ''}${left % 60} min more. Confirm to keep it.` : 'Your hold ran out. Anyone can take it now.'}</Text>
}

function Line({ icon: Icon, text }: { icon: typeof MapPin; text: string }) {
  return (
    <View style={styles.line}>
      <Icon size={18} color={colors.ink500} />
      <Text style={styles.flex}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  sections: { gap: 14, marginTop: 8 },
  flex: { flex: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pay: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface100, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12 },
  artwork: { aspectRatio: 4 / 3, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface100 },
})
