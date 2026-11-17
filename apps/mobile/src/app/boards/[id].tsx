import { useCallback, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import { Compass, FileSignature, Lightbulb, MapPin, Ruler, User } from 'lucide-react-native'
import type { BoardAgreement, BoardDetail } from '@greyboards/types'
import { BoardCover, BoardStatusBadge, boardPlace, formatHeading, formatRate, formatSize } from '@/components/boards/BoardBits'
import { Section, SettingsPage } from '@/components/settings/SettingsPage'
import { Button, Callout, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem, PlainProblem } from '@/lib/forms'
import { megabytes, useLimits } from '@/lib/limits'
import { currentSpot } from '@/lib/location'
import { uploadFile } from '@/lib/upload-file'
import { useAction } from '@/lib/use-action'
import { colors, radius } from '@/theme'

const REVIEW_NOTES: Record<BoardDetail['status'], string> = {
  pending: 'A reviewer checks the photos and location before it goes on the map.',
  listed: 'On the map. Advertisers can find and book it.',
  rejected: 'A reviewer didn’t list it. Fix what the note says and it goes back for review.',
  unlisted: 'Off the map for now. Advertisers can’t book it.',
}

const AGREEMENT_NOTES: Record<BoardAgreement['status'], string> = {
  sent: 'Texted to the owner. Waiting for them to sign.',
  signed: 'Signed. Bookings pay the owner their share.',
  declined: 'The owner declined. Talk to them, then send it again.',
  cancelled: 'Cancelled. Send a new one when you’re ready.',
  expired: 'The link ran out before they signed. Send it again.',
}

/** A board you tagged: where its review stands, its photos, and for scouts the owner's agreement. */
export default function BoardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { maxImageMb } = useLimits()
  const [board, setBoard] = useState<BoardDetail | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const photo = useAction()
  const agreement = useAction()

  const load = useCallback(() => {
    api
      .board(id)
      .send()
      .then(({ data }) => setBoard(data))
      .catch((error) => setProblem(FormProblem.from(error).message))
  }, [id])

  useFocusEffect(load)

  const addPhoto = () =>
    photo.run(async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync()

      if (!permission.granted) throw new PlainProblem('Allow the camera for Greyboards in your phone settings to photograph the board.')

      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 })

      if (result.canceled) return

      const asset = result.assets[0]!

      if (asset.fileSize && asset.fileSize > megabytes(maxImageMb)) throw new PlainProblem(`That photo is larger than ${maxImageMb} MB.`)

      const where = await currentSpot().catch(() => null)

      await api.account.addBoardPhoto(id, uploadFile(asset), { ...(where ?? {}), takenAt: new Date().toISOString() }).send()
      load()

      return where ? 'Photo added.' : 'Photo added without a location.'
    })

  const sendAgreement = () =>
    agreement.run(async () => {
      const { data } = await api.account.sendAgreement(id).send()

      load()

      return `Sent to ${data.ownerName ?? 'the owner'} by SMS.`
    })

  if (!board) {
    return (
      <SettingsPage title="Board">
        {problem ? <Callout>{problem}</Callout> : <Text variant="muted">Loading…</Text>}
      </SettingsPage>
    )
  }

  const rate = formatRate(board.rate)
  const scouted = !!board.owner && board.owner.userId !== board.taggedById

  return (
    <SettingsPage title={board.name}>
      <BoardStatusBadge status={board.status} />

      <View style={styles.sections}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
          {board.photos.length ? (
            board.photos.map((shot) => (
              <View key={shot.id} style={styles.photo}>
                <Image source={{ uri: shot.url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
                {shot.distanceM !== null ? <Text style={styles.distance}>{shot.distanceM} m from the pin</Text> : null}
              </View>
            ))
          ) : (
            <BoardCover board={board} style={styles.photo} />
          )}
        </ScrollView>
        <Button title={photo.busy ? 'Uploading…' : 'Add a photo'} variant="secondary" loading={photo.busy} disabled={board.photos.length >= 12} onPress={addPhoto} />
        {photo.problem.message ? <Callout>{photo.problem.message}</Callout> : null}

        <Section>
          <Text variant="muted">{REVIEW_NOTES[board.status]}</Text>
          {board.reviewNote ? <Callout>{board.reviewNote}</Callout> : null}
          <Line icon={MapPin} text={boardPlace(board)} />
          <Line icon={Ruler} text={`${board.kindLabel}, ${formatSize(board)}${board.faces > 1 ? `, ${board.faces} faces` : ''}`} />
          {board.headingDeg !== null || board.facing ? <Line icon={Compass} text={[board.headingDeg !== null ? formatHeading(board.headingDeg) : null, board.facing].filter(Boolean).join(', ')} /> : null}
          {board.lit ? <Line icon={Lightbulb} text="Lit at night" /> : null}
          {rate ? <Text variant="title">{rate}</Text> : <Text variant="muted">No rate yet. Add one on the web to take bookings.</Text>}
        </Section>

        {board.owner ? (
          <Section title="Owner">
            <Line icon={User} text={`${board.owner.name}${board.owner.phone ? ` · ${board.owner.phone}` : ''}`} />
            {scouted ? (
              <>
                <View style={styles.agreement}>
                  <FileSignature size={18} color={colors.brand600} />
                  <Text variant="muted" style={styles.flex}>
                    {board.agreement ? AGREEMENT_NOTES[board.agreement.status] : 'The owner signs an agreement by SMS before the board can be booked.'}
                  </Text>
                </View>
                {board.agreement?.status !== 'signed' ? (
                  <Button
                    title={agreement.busy ? 'Sending…' : board.agreement ? 'Text it again' : 'Text the owner the agreement'}
                    loading={agreement.busy}
                    disabled={!!board.agreement?.resendInSeconds}
                    onPress={sendAgreement}
                  />
                ) : null}
                {board.agreement?.resendInSeconds ? <Text variant="small">You can text it again in {Math.ceil(board.agreement.resendInSeconds / 60)} min.</Text> : null}
                {agreement.problem.message ? <Callout>{agreement.problem.message}</Callout> : null}
              </>
            ) : null}
          </Section>
        ) : null}
      </View>
    </SettingsPage>
  )
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
  photos: { gap: 10 },
  photo: { width: 280, height: 182, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surface100 },
  distance: { position: 'absolute', bottom: 10, left: 10, fontSize: 12, color: colors.ink900, backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, overflow: 'hidden' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  agreement: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
})
