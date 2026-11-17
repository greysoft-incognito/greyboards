import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { Linking, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import { CalendarClock, MapPin, Ruler } from 'lucide-react-native'
import type { PrintJob } from '@greyboards/types'
import { BoardCover, boardPlace, formatSize } from '@/components/boards/BoardBits'
import { JobStatusBadge, formatDay, formatDistance, formatMoney } from '@/components/jobs/JobBits'
import { MessagesSection } from '@/components/messages/MessagesSection'
import { ProofSection } from '@/components/proofs/ProofSection'
import { Section, SettingsPage } from '@/components/settings/SettingsPage'
import { Button, Callout, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem, PlainProblem } from '@/lib/forms'
import { megabytes, useLimits } from '@/lib/limits'
import { uploadFile } from '@/lib/upload-file'
import { useAction } from '@/lib/use-action'
import { colors, radius } from '@/theme'

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
          <View style={styles.pay}>
            <Text variant="muted" style={styles.flex}>
              You earn, once the ad is up
            </Text>
            <Text variant="title">{formatMoney(job.feeMinor, job.currency)}</Text>
          </View>
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

/** What the billposter does next: reserve, confirm, show the print, then put it up. */
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

  if (job.status === 'open') {
    body = (
      <>
        <Button title={action.busy ? 'Reserving…' : 'Reserve this job'} loading={action.busy} onPress={() => act(() => api.printJobs.reserve(job.id).send(), 'Held for you. Confirm once you know you can make the date.')} />
        <Text variant="small">We hold it for you for a few hours so you can check the date and the materials. You see the artwork once it’s held.</Text>
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
