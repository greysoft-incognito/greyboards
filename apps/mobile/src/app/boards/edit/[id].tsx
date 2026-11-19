import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { MapPin } from 'lucide-react-native'
import type { BoardDetail, BoardKindDefinition } from '@greyboards/types'
import { BoardDetailsSection, CountryField, RateSection, boardInput, useBoardFields } from '@/components/boards/BoardFields'
import { Section, SettingsPage } from '@/components/settings/SettingsPage'
import { Button, Callout, Field, Input, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { currentSpot, type Spot } from '@/lib/location'
import { useAction } from '@/lib/use-action'
import { colors } from '@/theme'

/** Change a board's details. Moving or resizing a listed board sends it back for review. */
export default function EditBoardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [board, setBoard] = useState<BoardDetail | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      api
        .board(id)
        .send()
        .then(({ data }) => setBoard(data))
        .catch((error) => setProblem(FormProblem.from(error).message))
    }, [id]),
  )

  if (!board) {
    return <SettingsPage title="Edit board">{problem ? <Callout>{problem}</Callout> : <ActivityIndicator color={colors.brand600} />}</SettingsPage>
  }

  return <EditBoardForm key={board.id} board={board} />
}

function EditBoardForm({ board }: { board: BoardDetail }) {
  const { fields, set } = useBoardFields(board)
  const [kinds, setKinds] = useState<BoardKindDefinition[]>([])
  const [spot, setSpot] = useState<Spot>({ latitude: board.latitude, longitude: board.longitude, accuracyM: null })
  const locate = useAction()
  const save = useAction()
  const errors = save.problem.fields

  useEffect(() => {
    api
      .boardKinds()
      .send()
      .then(({ data }) => setKinds(data))
      .catch(() => undefined)
  }, [])

  const placeAgain = () =>
    locate.run(async () => {
      setSpot(await currentSpot())

      return 'Location updated.'
    })

  const submit = () =>
    save.run(async () => {
      await api.account.updateBoard(board.id, boardInput(fields, spot)).send()
      if (router.canGoBack()) router.back()
      else router.replace({ pathname: '/boards/[id]', params: { id: board.id } })

      return 'Board saved.'
    })

  return (
    <SettingsPage title="Edit board" description={board.status === 'listed' ? 'If you move or resize it, we’ll review it again before it goes back live.' : 'We’ll review your changes.'}>
      <Section title="Where it is">
        <View style={styles.spot}>
          <MapPin size={20} color={colors.brand600} />
          <View style={styles.flex}>
            <Text variant="label">
              {spot.latitude.toFixed(6)}, {spot.longitude.toFixed(6)}
            </Text>
            <Text variant="small">{spot.accuracyM ? `Accurate to about ${spot.accuracyM} m.` : 'Stand next to the board to update its location.'}</Text>
          </View>
        </View>
        {locate.problem.message ? <Callout>{locate.problem.message}</Callout> : null}
        <Button title={locate.busy ? 'Finding your location…' : 'Use my location'} variant="secondary" loading={locate.busy} onPress={placeAgain} />
        <Field label="Street address" error={errors.address}>
          <Input value={fields.address} onChangeText={set('address')} maxLength={191} placeholder="Admiralty Way, by the roundabout" />
        </Field>
        <Field label="City" error={errors.city}>
          <Input value={fields.city} onChangeText={set('city')} maxLength={80} placeholder="Kaduna" autoCapitalize="words" />
        </Field>
        <CountryField fields={fields} set={set} errors={errors} />
      </Section>

      <BoardDetailsSection fields={fields} set={set} errors={errors} kinds={kinds} board={board} />
      <RateSection fields={fields} set={set} errors={errors} spot={spot} percent={board.ownerPercent ?? null} exceptId={board.id} />

      {save.problem.summary ? <Callout>{save.problem.summary}</Callout> : null}
      <Button title={save.busy ? 'Saving…' : 'Save changes'} size="lg" loading={save.busy} disabled={!fields.name.trim() || !fields.widthM || !fields.heightM} onPress={submit} />
    </SettingsPage>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  spot: { flexDirection: 'row', alignItems: 'center', gap: 12 },
})
