import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { BadgeCheck, Camera, X } from 'lucide-react-native'
import type { BookingProof } from '@greyboards/types'
import { Section } from '@/components/settings/SettingsPage'
import { Button, Callout, Field, Input, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { PlainProblem } from '@/lib/forms'
import { megabytes, useLimits } from '@/lib/limits'
import { currentSpot } from '@/lib/location'
import { uploadFile } from '@/lib/upload-file'
import { useAction } from '@/lib/use-action'
import { colors, radius } from '@/theme'

/** When the proof is with the advertiser, or accepted. */
function explain(proof: BookingProof) {
  const at = (moment: string) => new Date(moment).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

  if (proof.status === 'accepted') return `Accepted${proof.acceptedAt ? ` ${at(proof.acceptedAt)}` : ''}. The money left escrow and everyone is paid.`
  if (proof.status === 'submitted' && proof.canReview) {
    return `Check the photos. Accepting puts your ad live and pays everyone.${proof.acceptsAt ? ` If you don't answer by ${at(proof.acceptsAt)}, it counts as accepted.` : ''}`
  }
  if (proof.status === 'submitted') return `With the advertiser to check.${proof.acceptsAt ? ` It counts as accepted at ${at(proof.acceptsAt)} if they don't answer.` : ''}`
  if (proof.canAdd) return `Once it's up, take at least ${proof.minPhotos} photos showing the whole ad, standing within ${proof.maxDistanceM} m of the board with location on.`

  return 'Once the ad is up, photos taken at the board show here for you to check. Nobody is paid until then.'
}

/**
 * Proof the ad is up. Whoever photographs it takes each photo with the camera at the board,
 * sent with where the phone is; the API turns away photos taken too far off. The advertiser
 * then accepts, which pays everyone, or says what to fix.
 */
export function ProofSection({ bookingId, proof, onChange }: { bookingId: string; proof: BookingProof; onChange: () => void }) {
  const { maxImageMb } = useLimits()
  const add = useAction()
  const remove = useAction()
  const submit = useAction()
  const review = useAction()
  const [disputing, setDisputing] = useState(false)
  const [note, setNote] = useState('')
  const enough = proof.photos.length >= proof.minPhotos

  const takePhoto = () =>
    add.run(async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync()

      if (!permission.granted) throw new PlainProblem('Allow the camera for Greyboards in your phone settings to photograph the ad.')

      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85, exif: false })

      if (result.canceled) return

      const asset = result.assets[0]!

      if (asset.fileSize && asset.fileSize > megabytes(maxImageMb)) throw new PlainProblem(`That photo is larger than ${maxImageMb} MB.`)

      const where = await currentSpot()

      await api.proofs.add(bookingId, uploadFile(asset), { latitude: where.latitude, longitude: where.longitude, accuracyM: where.accuracyM, takenAt: new Date().toISOString() }).send()
      onChange()

      return 'Photo added.'
    })

  const drop = (photoId: string) =>
    remove.run(async () => {
      await api.proofs.remove(bookingId, photoId).send()
      onChange()

      return 'Photo removed.'
    })

  const send = () =>
    submit.run(async () => {
      await api.proofs.submit(bookingId).send()
      onChange()

      return 'Sent to the advertiser to check.'
    })

  const accept = () =>
    review.run(async () => {
      await api.proofs.accept(bookingId).send()
      onChange()

      return 'Accepted. Your ad is live and everyone is paid.'
    })

  const dispute = () =>
    review.run(async () => {
      await api.proofs.dispute(bookingId, note).send()
      setDisputing(false)
      onChange()

      return 'Sent back with your note.'
    })

  const problem = add.problem.message || remove.problem.message || submit.problem.message || review.problem.message

  return (
    <Section title="Proof it's up">
      <View style={styles.head}>
        {proof.status === 'accepted' ? <BadgeCheck size={20} color={colors.available} /> : <Camera size={20} color={colors.brand600} />}
        <Text variant="muted" style={styles.flex}>
          {explain(proof)}
        </Text>
      </View>
      {proof.status === 'disputed' && proof.note ? <Callout tone="warning">The advertiser said: {proof.note}</Callout> : null}

      {proof.photos.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
          {proof.photos.map((photo) => (
            <View key={photo.id} style={styles.photo}>
              <Image source={{ uri: photo.url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
              <Text style={styles.distance}>{photo.distanceM} m from the board</Text>
              {proof.canAdd ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Remove this photo" onPress={() => drop(photo.id)} disabled={remove.busy} style={styles.remove}>
                  <X size={16} color={colors.ink700} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </ScrollView>
      ) : null}

      {proof.canAdd ? (
        <>
          {proof.photos.length < proof.maxPhotos ? (
            <Button title={add.busy ? 'Uploading…' : 'Take a proof photo'} variant={enough ? 'secondary' : 'primary'} loading={add.busy} onPress={takePhoto} />
          ) : null}
          {enough ? <Button title={submit.busy ? 'Sending…' : 'Send to the advertiser'} loading={submit.busy} onPress={send} /> : null}
          <Text variant="small">
            {proof.photos.length} of {proof.minPhotos}+ photos
          </Text>
        </>
      ) : null}
      {proof.canReview && !disputing ? (
        <>
          <Button title="It's up, accept" loading={review.busy} onPress={accept} />
          <Button title="Report a problem" variant="ghost" disabled={review.busy} onPress={() => setDisputing(true)} />
        </>
      ) : null}
      {disputing ? (
        <>
          <Field label="What's wrong?">
            <Input value={note} onChangeText={setNote} multiline maxLength={500} placeholder="The left side is hidden by a tree. Please take one from across the road." />
          </Field>
          <Button title="Send it back" variant="danger" loading={review.busy} disabled={!note.trim()} onPress={dispute} />
          <Button title="Keep checking" variant="ghost" onPress={() => setDisputing(false)} />
        </>
      ) : null}
      {problem ? <Callout>{problem}</Callout> : null}
    </Section>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  flex: { flex: 1 },
  photos: { gap: 10 },
  photo: { width: 220, height: 160, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface100 },
  distance: { position: 'absolute', bottom: 8, left: 8, fontSize: 12, color: colors.ink900, backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, overflow: 'hidden' },
  remove: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.92)' },
})
