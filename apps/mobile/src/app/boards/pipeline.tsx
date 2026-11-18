import { useCallback, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import type { Prospect, ProspectInput, ProspectStage, Task } from '@greyboards/types'
import { Section, SettingsPage } from '@/components/settings/SettingsPage'
import { Button, Callout, Field, Input, Select, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { PlainProblem } from '@/lib/forms'
import { currentSpot } from '@/lib/location'
import { useAction } from '@/lib/use-action'
import { colors, radius } from '@/theme'

const STAGES: Record<ProspectStage, string> = {
  prospect: 'Spotted',
  contacted: 'Contacted',
  signed: 'Signed',
  captured: 'Captured',
  verified: 'Verified',
  earning: 'Earning',
  lost: 'Let go',
}

/** The stages a scout sets by hand; the rest follow the board once it's tagged. */
const MANUAL: ProspectStage[] = ['prospect', 'contacted', 'signed', 'lost']

const EMPTY = { name: '', ownerName: '', ownerPhone: '', notes: '' }

/** The scout's pipeline on the street: what needs doing, a quick way to note a board where they stand, and every prospect's stage. */
export default function Pipeline() {
  const load = useAction()
  const add = useAction()
  const move = useAction()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [form, setForm] = useState(EMPTY)
  const set = (key: keyof typeof EMPTY) => (value: string) => setForm((current) => ({ ...current, [key]: value }))

  const refresh = useCallback(
    () =>
      load.run(async () => {
        const [list, todo] = await Promise.all([api.prospects.list({ per_page: 50 }).send(), api.tasks().send()])

        setProspects(list.data)
        setTasks(todo.data)
      }),
    [],
  )

  useFocusEffect(
    useCallback(() => {
      refresh()
    }, [refresh]),
  )

  const submit = () =>
    add.run(async () => {
      if (!form.name.trim()) throw new PlainProblem('Say what the board is and where, so you can find it again.')

      const spot = await currentSpot()
      const text = (value: string) => value.trim() || null

      await api.prospects.create({ name: form.name.trim(), latitude: spot.latitude, longitude: spot.longitude, ownerName: text(form.ownerName), ownerPhone: text(form.ownerPhone), notes: text(form.notes) }).send()
      setForm(EMPTY)
      await refresh()

      return 'Added to your pipeline.'
    })

  const setStage = (prospect: Prospect, stage: ProspectStage) =>
    move.run(async () => {
      const { data } = await api.prospects.update(prospect.id, { stage: stage as ProspectInput['stage'] }).send()

      setProspects((shown) => shown.map((item) => (item.id === data.id ? data : item)))
    })

  return (
    <SettingsPage title="Pipeline" description="Boards you spotted, from first sighting to earning. Once you tag one, its stage follows the board.">
      <Section title="To do">
        {tasks.length ? (
          tasks.slice(0, 8).map((task, index) => (
            <View key={`${task.kind}-${index}`} style={styles.task}>
              <Text variant="label">{task.title}</Text>
              <Text variant="small">{task.detail}</Text>
            </View>
          ))
        ) : (
          <Text variant="muted">{load.busy ? 'Loading…' : 'Nothing to do right now.'}</Text>
        )}
        {load.problem.message ? <Callout>{load.problem.message}</Callout> : null}
      </Section>

      <Section title="Note a board here" description="Stand by it. We keep where you are, so two scouts don’t chase the same owner.">
        <Field label="What and where" error={add.problem.fields.name}>
          <Input value={form.name} onChangeText={set('name')} maxLength={120} placeholder="Unipole at the roundabout" />
        </Field>
        <Field label="Owner" error={add.problem.fields.ownerName}>
          <Input value={form.ownerName} onChangeText={set('ownerName')} maxLength={120} autoCapitalize="words" />
        </Field>
        <Field label="Owner’s phone" error={add.problem.fields.ownerPhone}>
          <Input value={form.ownerPhone} onChangeText={set('ownerPhone')} keyboardType="phone-pad" maxLength={20} />
        </Field>
        <Field label="Notes" error={add.problem.fields.notes}>
          <Input value={form.notes} onChangeText={set('notes')} maxLength={2000} multiline />
        </Field>
        {add.problem.message ? <Callout>{add.problem.message}</Callout> : null}
        <Button title="Add where I am" loading={add.busy} onPress={submit} />
      </Section>

      <Section title="Your pipeline">
        {move.problem.message ? <Callout>{move.problem.message}</Callout> : null}
        {prospects.length ? (
          prospects.map((prospect) => (
            <View key={prospect.id} style={styles.prospect}>
              <View style={styles.row}>
                <Text variant="label" style={styles.flex}>
                  {prospect.name}
                </Text>
                <Text style={styles.stage}>{STAGES[prospect.stage]}</Text>
              </View>
              {prospect.ownerName || prospect.ownerPhone ? <Text variant="small">{[prospect.ownerName, prospect.ownerPhone].filter(Boolean).join(' · ')}</Text> : null}
              {prospect.notes ? <Text variant="muted">{prospect.notes}</Text> : null}
              {!prospect.boardId && MANUAL.includes(prospect.stage) ? (
                <Select label="Stage" value={prospect.stage} onChange={(stage) => setStage(prospect, stage)} options={MANUAL.map((stage) => ({ value: stage, label: STAGES[stage] }))} disabled={move.busy} />
              ) : null}
            </View>
          ))
        ) : (
          <Text variant="muted">{load.busy ? 'Loading…' : 'Note the first board you spot.'}</Text>
        )}
      </Section>
    </SettingsPage>
  )
}

const styles = StyleSheet.create({
  task: { gap: 2, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.surface100 },
  prospect: { gap: 6, padding: 12, borderRadius: radius.lg, backgroundColor: colors.surface100 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  stage: { fontSize: 12, fontWeight: '700', color: colors.brand600, backgroundColor: colors.brand50, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
})
