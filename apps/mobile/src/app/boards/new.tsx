import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { Binoculars, Camera, LocateFixed, MapPin, Presentation, X } from 'lucide-react-native'
import type { BoardKind, BoardKindDefinition, BoardOwnerChoice, BoardRatePeriod } from '@greyboards/types'
import { OwnerPicker } from '@/components/boards/OwnerPicker'
import { taggingRoles } from '@/components/boards/BoardBits'
import { Section, SettingsPage } from '@/components/settings/SettingsPage'
import { Button, Callout, CheckOption, Field, Input, Select, Text } from '@/components/ui'
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

/** "12" or "12.5" as a number, or null while it isn't one. */
const decimal = (value: string) => (value.trim() && Number.isFinite(Number(value)) ? Number(value) : null)

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
  const [form, setForm] = useState({ name: '', kind: 'billboard' as BoardKind, widthM: '', heightM: '', faces: '1', lit: '0', facing: '', address: '', city: '', rate: '', ratePeriod: 'month' as BoardRatePeriod })
  const errors = save.problem.fields
  const set = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }))

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

      const rate = decimal(form.rate)
      const { data: board } = await api.account
        .tagBoard({
          as,
          name: form.name.trim(),
          kind: form.kind,
          widthM: decimal(form.widthM) ?? 0,
          heightM: decimal(form.heightM) ?? 0,
          faces: Number(form.faces),
          lit: form.lit === '1',
          facing: form.facing.trim() || null,
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          country: 'NG',
          latitude: spot.latitude,
          longitude: spot.longitude,
          accuracyM: spot.accuracyM,
          rateMinor: rate === null ? null : Math.round(rate * 100),
          ratePeriod: form.ratePeriod,
          ...(as === 'scout' ? owner : {}),
        })
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
    <SettingsPage title="Tag a board" description="Stand at the board. We place it from your phone and keep each photo with where it was taken.">
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
            <Text variant="small">{spot?.accuracyM ? `Accurate to about ${spot.accuracyM} m.` : 'Stand by the board for the best fix.'}</Text>
          </View>
        </View>
        {locate.problem.message ? <Callout>{locate.problem.message}</Callout> : null}
        {errors.latitude || errors.longitude ? <Callout>{errors.latitude ?? errors.longitude}</Callout> : null}
        <Button title={locate.busy ? 'Finding you…' : spot ? 'Place it again' : 'Use where I am'} variant="secondary" loading={locate.busy} onPress={findMe} />
        <Field label="Street address" error={errors.address}>
          <Input value={form.address} onChangeText={set('address')} maxLength={191} placeholder="Admiralty Way, by the roundabout" />
        </Field>
        <Field label="City" error={errors.city}>
          <Input value={form.city} onChangeText={set('city')} maxLength={80} placeholder="Lagos" autoCapitalize="words" />
        </Field>
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

      <Section title="The board">
        <Field label="Name" error={errors.name} hint="What advertisers see first. A landmark helps.">
          <Input value={form.name} onChangeText={set('name')} maxLength={120} placeholder="Admiralty Way, facing Lekki Phase 1" />
        </Field>
        <Field label="Kind" error={errors.kind}>
          <Select label="Kind" value={form.kind} onChange={set('kind')} options={(kinds.length ? kinds : [{ kind: 'billboard' as BoardKind, label: 'Billboard' }]).map((kind) => ({ value: kind.kind, label: kind.label }))} />
        </Field>
        <View style={styles.pair}>
          <View style={styles.flex}>
            <Field label="Width (m)" error={errors.widthM}>
              <Input value={form.widthM} onChangeText={set('widthM')} keyboardType="decimal-pad" placeholder="12" />
            </Field>
          </View>
          <View style={styles.flex}>
            <Field label="Height (m)" error={errors.heightM}>
              <Input value={form.heightM} onChangeText={set('heightM')} keyboardType="decimal-pad" placeholder="4" />
            </Field>
          </View>
        </View>
        <View style={styles.pair}>
          <View style={styles.flex}>
            <Field label="Faces">
              <Select label="Faces" value={form.faces} onChange={set('faces')} options={['1', '2', '3', '4'].map((faces) => ({ value: faces, label: faces === '1' ? 'One face' : `${faces} faces` }))} />
            </Field>
          </View>
          <View style={styles.flex}>
            <Field label="Lighting">
              <Select label="Lighting" value={form.lit} onChange={set('lit')} options={[{ value: '0', label: 'Not lit' }, { value: '1', label: 'Lit at night' }]} />
            </Field>
          </View>
        </View>
        <Field label="Facing" error={errors.facing} hint="Which traffic sees it.">
          <Input value={form.facing} onChangeText={set('facing')} maxLength={60} placeholder="Traffic to Ajah" />
        </Field>
      </Section>

      <Section title={as === 'scout' ? 'Owner and rate' : 'Rate'}>
        <View style={styles.pair}>
          <View style={styles.flex}>
            <Field label="Rate in naira" error={errors.rateMinor} hint={as === 'scout' ? 'What the owner asks, if you know.' : undefined}>
              <Input value={form.rate} onChangeText={set('rate')} keyboardType="number-pad" placeholder="850000" />
            </Field>
          </View>
          <View style={styles.flex}>
            <Field label="Per">
              <Select label="Per" value={form.ratePeriod} onChange={set('ratePeriod')} options={[{ value: 'month', label: 'Month' }, { value: 'week', label: 'Week' }]} />
            </Field>
          </View>
        </View>
        {as === 'scout' ? <OwnerPicker onChange={setOwner} errors={errors} /> : null}
      </Section>

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
  pair: { flexDirection: 'row', gap: 12 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
})
