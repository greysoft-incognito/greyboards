import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { Binoculars, Camera, LocateFixed, MapPin, Presentation, X } from 'lucide-react-native'
import type { BoardKindDefinition, BoardOwnerChoice, NearbyBoard } from '@greyboards/types'
import { BoardDetailsSection, CountryField, RateSection, boardInput, useBoardFields } from '@/components/boards/BoardFields'
import { OwnerPicker } from '@/components/boards/OwnerPicker'
import { taggingRoles } from '@/components/boards/BoardBits'
import { Section, SettingsPage } from '@/components/settings/SettingsPage'
import { Button, Callout, CheckOption, Field, Input, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { PlainProblem } from '@/lib/forms'
import { megabytes, useLimits } from '@/lib/limits'
import { currentSpot, type Spot } from '@/lib/location'
import { useUser } from '@/lib/session'
import { uploadFile } from '@/lib/upload-file'
import { useAction } from '@/lib/use-action'
import { colors, fonts, radius } from '@/theme'

/** A photo taken while tagging, with where the phone was. */
interface Shot {
  asset: ImagePicker.ImagePickerAsset
  spot: Spot | null
  takenAt: string
}

const MAX_SHOTS = 4

/**
 * Tag a board while standing at it: the phone places it, the camera takes its photos with
 * where they were taken, and a scout says who owns it so we can text them the agreement.
 */
export default function TagBoard() {
  const user = useUser()
  const roles = taggingRoles(user.accountRoles)
  const { maxImageMb } = useLimits()
  const locate = useAction()
  const shoot = useAction()
  const save = useAction()
  const [as, setAs] = useState<'owner' | 'scout'>(roles[0] ?? 'owner')
  const [spot, setSpot] = useState<Spot | null>(null)
  const [kinds, setKinds] = useState<BoardKindDefinition[]>([])
  const [shots, setShots] = useState<Shot[]>([])
  const [owner, setOwner] = useState<BoardOwnerChoice>({})
  const [nearby, setNearby] = useState<NearbyBoard[]>([])
  const [ownerPercents, setOwnerPercents] = useState<{ owner: number; scout: number } | null>(null)
  const { fields: form, set } = useBoardFields()
  const errors = save.problem.fields
  const heading = form.heading

  // Boards already tagged here and facing the same way, so nobody tags one twice.
  useEffect(() => {
    if (!spot) return setNearby([])

    let current = true
    const timer = setTimeout(() => {
      api.account
        .nearbyBoards({ lat: spot.latitude, lng: spot.longitude, headingDeg: heading })
        .then(({ data }) => current && setNearby(data))
        .catch(() => current && setNearby([]))
    }, 400)

    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [spot, heading])

  // The owner's percent of the rent, to show what the board lists at and what the owner gets.
  useEffect(() => {
    Promise.all([api.account.ownerPrice({ as: 'owner' }).send(), api.account.ownerPrice({ as: 'scout' }).send()])
      .then(([owner, scout]) => setOwnerPercents({ owner: owner.data.ownerPercent, scout: scout.data.ownerPercent }))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    api
      .boardKinds()
      .send()
      .then(({ data }) => setKinds(data))
      .catch(() => undefined)

    findMe()
  }, [])

  const findMe = () =>
    locate.run(async () => {
      setSpot(await currentSpot())
    })

  const takePhoto = () =>
    shoot.run(async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync()

      if (!permission.granted) throw new PlainProblem('Allow the camera for Greyboards in your phone settings to photograph the board.')

      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85, exif: false })

      if (result.canceled) return

      const asset = result.assets[0]!

      if (asset.fileSize && asset.fileSize > megabytes(maxImageMb)) throw new PlainProblem(`That photo is larger than ${maxImageMb} MB.`)

      const where = await currentSpot().catch(() => spot)

      setShots((taken) => [...taken, { asset, spot: where, takenAt: new Date().toISOString() }])

      if (!spot && where) setSpot(where)
    })

  const submit = () =>
    save.run(async () => {
      if (!spot) throw new PlainProblem('We need the board’s location. Tap “Use where I am” while standing at it.')

      const { data: board } = await api.account
        .tagBoard({ ...boardInput(form, spot), as, ...(as === 'scout' ? owner : {}) })
        .send()

      for (const shot of shots) {
        await api.account
          .addBoardPhoto(board.id, uploadFile(shot.asset), { ...(shot.spot ?? {}), takenAt: shot.takenAt })
          .send()
          .catch(() => undefined)
      }

      router.replace({ pathname: '/boards/[id]', params: { id: board.id } })

      return as === 'scout' ? 'Board tagged. Send the owner their agreement from here.' : 'Board tagged. A reviewer checks it next.'
    })

  if (!roles.length) {
    return (
      <SettingsPage title="Tag a board" description="Tagging boards is for owners and scouts.">
        <Button title="Choose a role" onPress={() => router.replace('/settings/roles')} />
      </SettingsPage>
    )
  }

  return (
    <SettingsPage title="Tag a board" description="Stand at the board. We’ll place it using your phone’s location.">
      {roles.length > 1 ? (
        <Section title="Whose board is it?">
          <CheckOption label="It's my board" description="You own it and set its rate." checked={as === 'owner'} onPress={() => setAs('owner')} />
          <CheckOption label="I found it" description="You scouted it. We'll text the owner to sign." checked={as === 'scout'} onPress={() => setAs('scout')} />
        </Section>
      ) : (
        <View style={styles.as}>
          {as === 'scout' ? <Binoculars size={18} color={colors.brand600} /> : <Presentation size={18} color={colors.brand600} />}
          <Text variant="label">{as === 'scout' ? 'Tagging as a scout' : 'Tagging your own board'}</Text>
        </View>
      )}

      <Section title="Where it is">
        <View style={styles.spot}>
          <View style={styles.pin}>
            <MapPin size={20} color={spot ? colors.brand600 : colors.ink500} />
          </View>
          <View style={styles.flex}>
            <Text variant="label">{spot ? `${spot.latitude.toFixed(6)}, ${spot.longitude.toFixed(6)}` : locate.busy ? 'Finding you…' : 'Not placed yet'}</Text>
            <Text variant="small">{spot?.accuracyM ? `Accurate to about ${spot.accuracyM} m.` : 'Stand by the board for the most accurate spot.'}</Text>
          </View>
        </View>
        {locate.problem.message ? <Callout>{locate.problem.message}</Callout> : null}
        {errors.latitude || errors.longitude ? <Callout>{errors.latitude ?? errors.longitude}</Callout> : null}
        {nearby.length ? (
          <Callout tone="warning">
            {nearby.length === 1 ? 'A board is already tagged here' : `${nearby.length} boards are already tagged here`}: {nearby.map((board) => `${board.name} (${board.distanceM} m)`).join(', ')}. Check it isn’t this one. If you tag it anyway, our reviewers will compare them.
          </Callout>
        ) : null}
        <Button title={locate.busy ? 'Finding you…' : spot ? 'Place it again' : 'Use where I am'} variant="secondary" loading={locate.busy} onPress={findMe} />
        <Field label="Street address" error={errors.address}>
          <Input value={form.address} onChangeText={set('address')} maxLength={191} placeholder="Admiralty Way, by the roundabout" />
        </Field>
        <Field label="City" error={errors.city}>
          <Input value={form.city} onChangeText={set('city')} maxLength={80} placeholder="Kaduna" autoCapitalize="words" />
        </Field>
        <CountryField fields={form} set={set} errors={errors} />
      </Section>

      <Section title="Photos" description={`Take up to ${MAX_SHOTS}, from where traffic sees it. The first is the cover.`}>
        <View style={styles.shots}>
          {shots.map((shot, index) => (
            <View key={shot.asset.uri} style={styles.shot}>
              <Image source={{ uri: shot.asset.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <Pressable accessibilityRole="button" accessibilityLabel="Remove this photo" hitSlop={6} onPress={() => setShots((taken) => taken.filter((_, at) => at !== index))} style={styles.remove}>
                <X size={14} color={colors.ink900} />
              </Pressable>
              {!shot.spot ? <Text style={styles.noSpot}>No location</Text> : null}
            </View>
          ))}
          {shots.length < MAX_SHOTS ? (
            <Pressable accessibilityRole="button" onPress={takePhoto} disabled={shoot.busy} style={({ pressed }) => [styles.shot, styles.take, pressed && styles.takePressed]}>
              <Camera size={22} color={colors.ink500} />
              <Text variant="small">{shoot.busy ? 'Opening…' : 'Take photo'}</Text>
            </Pressable>
          ) : null}
        </View>
        {shoot.problem.message ? <Callout>{shoot.problem.message}</Callout> : null}
      </Section>

      <BoardDetailsSection fields={form} set={set} errors={errors} kinds={kinds} />

      <RateSection fields={form} set={set} errors={errors} spot={spot} percent={ownerPercents?.[as] ?? null} scouting={as === 'scout'}>
        {as === 'scout' ? <OwnerPicker onChange={setOwner} errors={errors} /> : null}
      </RateSection>

      {save.problem.summary ? <Callout>{save.problem.summary}</Callout> : null}
      <Button
        title={save.busy ? (shots.length ? 'Tagging and uploading…' : 'Tagging…') : 'Tag this board'}
        size="lg"
        loading={save.busy}
        disabled={!form.name.trim() || !form.widthM || !form.heightM}
        onPress={submit}
      />
      <View style={styles.note}>
        <LocateFixed size={14} color={colors.ink500} />
        <Text variant="small" style={styles.flex}>
          A reviewer checks every board before it goes on the map.
        </Text>
      </View>
    </SettingsPage>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  as: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  spot: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pin: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand50, alignItems: 'center', justifyContent: 'center' },
  shots: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  shot: { width: 96, height: 96, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface100 },
  take: { alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.surface300, backgroundColor: colors.white },
  takePressed: { borderColor: colors.brand300 },
  remove: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  noSpot: { position: 'absolute', bottom: 6, left: 6, fontSize: 10, fontFamily: fonts.semibold, color: colors.white, backgroundColor: 'rgba(30,31,34,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
})
