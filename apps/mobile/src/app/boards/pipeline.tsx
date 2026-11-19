import { useCallback, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { MapPinned, Trash2 } from 'lucide-react-native'
import type { Prospect, ProspectInput, ProspectStage, Task, Territory } from '@greyboards/types'
import { MANUAL_STAGES, STAGES, StageBadge, TaskList } from '@/components/scouting/ScoutingBits'
import { Section, SettingsPage } from '@/components/settings/SettingsPage'
import { Button, Callout, Chip, Field, Input, Select, Sheet, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { confirm } from '@/lib/confirm'
import { PlainProblem } from '@/lib/forms'
import { currentSpot } from '@/lib/location'
import { useAction } from '@/lib/use-action'
import { colors, fonts, radius } from '@/theme'

type Details = { name: string; address: string; ownerName: string; ownerPhone: string; notes: string }

const EMPTY: Details = { name: '', address: '', ownerName: '', ownerPhone: '', notes: '' }

const PER_PAGE = 20

const detailsOf = (prospect: Prospect): Details => ({
  name: prospect.name,
  address: prospect.address ?? '',
  ownerName: prospect.ownerName ?? '',
  ownerPhone: prospect.ownerPhone ?? '',
  notes: prospect.notes ?? '',
})

const input = (details: Details): ProspectInput => {
  const text = (value: string) => value.trim() || null

  return { name: details.name.trim(), address: text(details.address), ownerName: text(details.ownerName), ownerPhone: text(details.ownerPhone), notes: text(details.notes) }
}

/** The scout's pipeline on the street: what needs doing, a quick way to note a board where they stand, and every prospect's stage. */
export default function Pipeline() {
  const load = useAction()
  const more = useAction()
  const add = useAction()
  const move = useAction()
  const [stage, setStage] = useState<ProspectStage | null>(null)
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [counts, setCounts] = useState<Partial<Record<ProspectStage, number>>>({})
  const [page, setPage] = useState({ current: 0, last: 1 })
  const [tasks, setTasks] = useState<Task[]>([])
  const [territories, setTerritories] = useState<Territory[]>([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState<Prospect | null>(null)
  const total = Object.values(counts).reduce((sum, count) => sum + (count ?? 0), 0)
  const set = (key: keyof Details) => (value: string) => setForm((current) => ({ ...current, [key]: value }))

  const refresh = useCallback(
    (filter: ProspectStage | null) =>
      load.run(async () => {
        const [list, todo, areas] = await Promise.all([
          api.prospects.list({ stage: filter ?? undefined, per_page: PER_PAGE }).send(),
          api.tasks().send(),
          api.territories().send(),
        ])

        setProspects(list.data)
        setCounts(list.counts)
        setPage({ current: list.meta.current_page, last: list.meta.last_page })
        setTasks(todo.data)
        setTerritories(areas.data)
      }),
    [],
  )

  useFocusEffect(
    useCallback(() => {
      refresh(stage)
    }, [refresh, stage]),
  )

  const loadMore = () =>
    more.run(async () => {
      const list = await api.prospects.list({ stage: stage ?? undefined, page: page.current + 1, per_page: PER_PAGE }).send()

      setProspects((shown) => [...shown, ...list.data])
      setPage({ current: list.meta.current_page, last: list.meta.last_page })
    })

  const submit = () =>
    add.run(async () => {
      if (!form.name.trim()) throw new PlainProblem('Describe the board and where it is.')

      const spot = await currentSpot()

      await api.prospects.create({ ...input(form), name: form.name.trim(), latitude: spot.latitude, longitude: spot.longitude }).send()
      setForm(EMPTY)
      await refresh(stage)

      return 'Added.'
    })

  const changeStage = (prospect: Prospect, next: ProspectStage) =>
    move.run(async () => {
      const { data } = await api.prospects.update(prospect.id, { stage: next as ProspectInput['stage'] }).send()

      if (stage && data.stage !== stage) {
        setProspects((shown) => shown.filter((item) => item.id !== data.id))
      } else {
        setProspects((shown) => shown.map((item) => (item.id === data.id ? data : item)))
      }

      setCounts((current) => ({ ...current, [prospect.stage]: Math.max(0, (current[prospect.stage] ?? 1) - 1), [data.stage]: (current[data.stage] ?? 0) + 1 }))
    })

  return (
    <SettingsPage title="Pipeline" description="Keep track of boards you’ve spotted, from first sighting to first booking.">
      <Section title="To do">
        {load.busy && !tasks.length ? <Text variant="muted">Loading…</Text> : <TaskList tasks={tasks} limit={8} />}
        {load.problem.message ? <Callout>{load.problem.message}</Callout> : null}
      </Section>

      <Section title="Save a board" description="Stand next to it so we can save the location.">
        <Field label="What and where" error={add.problem.fields.name}>
          <Input value={form.name} onChangeText={set('name')} maxLength={120} placeholder="Unipole at the roundabout" />
        </Field>
        <Field label="Address" error={add.problem.fields.address}>
          <Input value={form.address} onChangeText={set('address')} maxLength={191} />
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipRow}>
          <Chip label={`All ${total}`} selected={!stage} onPress={() => setStage(null)} />
          {STAGES.map((entry) => (
            <Chip key={entry.value} label={`${entry.label} ${counts[entry.value] ?? 0}`} selected={stage === entry.value} onPress={() => setStage(entry.value)} />
          ))}
        </ScrollView>
        {move.problem.message ? <Callout>{move.problem.message}</Callout> : null}
        {prospects.length ? (
          prospects.map((prospect) => <ProspectCard key={prospect.id} prospect={prospect} busy={move.busy} onStage={(next) => changeStage(prospect, next)} onEdit={() => setEditing(prospect)} />)
        ) : (
          <Text variant="muted">{load.busy ? 'Loading…' : stage ? 'Nothing at this stage.' : 'Save the first board you spot.'}</Text>
        )}
        {page.current < page.last ? <Button title="Show more" variant="ghost" loading={more.busy} onPress={loadMore} /> : null}
        {more.problem.message ? <Callout>{more.problem.message}</Callout> : null}
      </Section>

      {territories.length ? (
        <Section title="Your territories">
          {territories.map((territory) => (
            <View key={territory.id} style={styles.territory}>
              <MapPinned size={16} color={colors.brand700} />
              <Text style={styles.territoryText}>
                {territory.name} · {(territory.radiusM / 1000).toFixed(1)} km around {territory.latitude.toFixed(4)}, {territory.longitude.toFixed(4)}
              </Text>
            </View>
          ))}
        </Section>
      ) : null}

      <EditProspect
        prospect={editing}
        onClose={() => setEditing(null)}
        onSaved={(saved) => setProspects((shown) => shown.map((item) => (item.id === saved.id ? saved : item)))}
        onRemoved={() => {
          setEditing(null)
          refresh(stage)
        }}
      />
    </SettingsPage>
  )
}

function ProspectCard({ prospect, busy, onStage, onEdit }: { prospect: Prospect; busy: boolean; onStage: (stage: ProspectStage) => void; onEdit: () => void }) {
  const manual = MANUAL_STAGES.includes(prospect.stage) && !prospect.boardId
  const where = prospect.address ?? `${prospect.latitude.toFixed(5)}, ${prospect.longitude.toFixed(5)}`

  return (
    <View style={styles.prospect}>
      <View style={styles.row}>
        <Text style={[styles.flex, styles.name]}>{prospect.name}</Text>
        <StageBadge stage={prospect.stage} />
      </View>
      <Text variant="small">{[where, prospect.ownerName, prospect.ownerPhone].filter(Boolean).join(' · ')}</Text>
      {prospect.notes ? <Text variant="muted">{prospect.notes}</Text> : null}
      {manual ? (
        <Select
          label="Stage"
          value={prospect.stage}
          onChange={onStage}
          options={STAGES.filter((entry) => MANUAL_STAGES.includes(entry.value)).map((entry) => ({ value: entry.value, label: entry.label }))}
          disabled={busy}
        />
      ) : null}
      <View style={styles.links}>
        {prospect.boardId ? (
          <Text variant="link" accessibilityRole="link" onPress={() => router.push({ pathname: '/boards/[id]', params: { id: prospect.boardId! } })}>
            See the board
          </Text>
        ) : prospect.stage === 'signed' ? (
          <Text variant="link" accessibilityRole="link" onPress={() => router.push('/boards/new')}>
            Tag the board
          </Text>
        ) : null}
        <Text variant="link" accessibilityRole="button" style={styles.edit} onPress={onEdit}>
          Edit
        </Text>
      </View>
    </View>
  )
}

function EditProspect({ prospect, onClose, onSaved, onRemoved }: { prospect: Prospect | null; onClose: () => void; onSaved: (prospect: Prospect) => void; onRemoved: () => void }) {
  const save = useAction()
  const [details, setDetails] = useState(EMPTY)
  const [shownFor, setShownFor] = useState<Prospect | null>(null)
  const set = (key: keyof Details) => (value: string) => setDetails((current) => ({ ...current, [key]: value }))

  if (prospect && prospect !== shownFor) {
    setShownFor(prospect)
    setDetails(detailsOf(prospect))
  }

  const submit = () =>
    save.run(async () => {
      if (!prospect) return

      const { data } = await api.prospects.update(prospect.id, input(details)).send()

      onSaved(data)
      onClose()

      return 'Saved.'
    })

  const remove = async () => {
    if (!prospect || !(await confirm('Remove this board?', `${prospect.name} will leave your pipeline.`, 'Remove'))) return

    await save.run(async () => {
      await api.prospects.remove(prospect.id).send()
      onRemoved()

      return 'Removed.'
    })
  }

  return (
    <Sheet visible={!!prospect} title="Edit" onClose={onClose}>
      <Field label="What and where" error={save.problem.fields.name}>
        <Input value={details.name} onChangeText={set('name')} maxLength={120} />
      </Field>
      <Field label="Address" error={save.problem.fields.address}>
        <Input value={details.address} onChangeText={set('address')} maxLength={191} />
      </Field>
      <Field label="Owner" error={save.problem.fields.ownerName}>
        <Input value={details.ownerName} onChangeText={set('ownerName')} maxLength={120} autoCapitalize="words" />
      </Field>
      <Field label="Owner’s phone" error={save.problem.fields.ownerPhone}>
        <Input value={details.ownerPhone} onChangeText={set('ownerPhone')} keyboardType="phone-pad" maxLength={20} />
      </Field>
      <Field label="Notes" error={save.problem.fields.notes}>
        <Input value={details.notes} onChangeText={set('notes')} maxLength={2000} multiline />
      </Field>
      {save.problem.summary ? <Callout>{save.problem.summary}</Callout> : null}
      <Button title="Save" loading={save.busy} onPress={submit} />
      <View style={styles.remove}>
        <Trash2 size={16} color={colors.red700} />
        <Text style={styles.removeText} accessibilityRole="button" onPress={remove} disabled={save.busy}>
          Remove from pipeline
        </Text>
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chipRow: { marginHorizontal: -18 },
  chips: { gap: 8, paddingHorizontal: 18 },
  prospect: { gap: 8, padding: 14, borderRadius: radius.lg, backgroundColor: colors.canvas },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  name: { fontFamily: fonts.semibold, color: colors.ink900 },
  links: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  edit: { marginLeft: 'auto' },
  territory: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  territoryText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.ink700 },
  remove: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  removeText: { fontFamily: fonts.semibold, color: colors.red700 },
})
