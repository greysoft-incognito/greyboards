import { useCallback, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { ArrowRight } from 'lucide-react-native'
import type { Board, PriceChange, PriceRuleResult } from '@greyboards/types'
import { formatRate } from '@/components/boards/BoardBits'
import { Section, SettingsPage } from '@/components/settings/SettingsPage'
import { Button, Callout, CheckOption, Field, Input, Select, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { PlainProblem } from '@/lib/forms'
import { formatMoney, plural } from '@/lib/format'
import { useAction } from '@/lib/use-action'
import { colors, fonts } from '@/theme'

const PER_PAGE = 50

const CHANGES: { value: PriceChange; label: string }[] = [
  { value: 'percent', label: 'By percentage' },
  { value: 'amount', label: 'By an amount' },
  { value: 'set', label: 'Set one rate' },
]

const ROUNDING = ['1', '1000', '5000', '10000'] as const

type Rule = { change: PriceChange; direction: 'up' | 'down'; value: string; roundTo: (typeof ROUNDING)[number]; faces: '1' | '0' }

/** Owners change many boards' rates at once: up or down by a percent or an amount, or to one amount. */
export default function Prices() {
  const load = useAction()
  const more = useAction()
  const preview = useAction()
  const apply = useAction()
  const [boards, setBoards] = useState<Board[]>([])
  const [page, setPage] = useState({ current: 0, last: 1 })
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [rule, setRule] = useState<Rule>({ change: 'percent', direction: 'up', value: '', roundTo: '1000', faces: '1' })
  const [result, setResult] = useState<PriceRuleResult | null>(null)
  const set = <K extends keyof Rule>(key: K) => (value: Rule[K]) => {
    setRule((current) => ({ ...current, [key]: value }))
    setResult(null)
  }

  const addPage = (list: Board[]) => {
    setBoards((shown) => [...shown, ...list])
    setPicked((current) => new Set([...current, ...list.filter((board) => board.rate).map((board) => board.id)]))
  }

  useFocusEffect(
    useCallback(() => {
      load.run(async () => {
        const list = await api.account.boards({ per_page: PER_PAGE }).send()

        setBoards([])
        setPicked(new Set())
        addPage(list.data)
        setPage({ current: list.meta.current_page, last: list.meta.last_page })
      })
    }, []),
  )

  const loadMore = () =>
    more.run(async () => {
      const list = await api.account.boards({ page: page.current + 1, per_page: PER_PAGE }).send()

      addPage(list.data)
      setPage({ current: list.meta.current_page, last: list.meta.last_page })
    })

  const toggle = (id: string) => {
    setPicked((current) => {
      const next = new Set(current)

      if (next.has(id)) next.delete(id)
      else next.add(id)

      return next
    })
    setResult(null)
  }

  const pickAll = () => {
    setPicked(picked.size ? new Set() : new Set(boards.map((board) => board.id)))
    setResult(null)
  }

  const send = async (dryRun: boolean) => {
    const raw = Number(rule.value)

    if (!rule.value.trim() || Number.isNaN(raw) || raw < 0) throw new PlainProblem(rule.change === 'percent' ? 'Enter a percent.' : 'Enter an amount.')

    const down = rule.change !== 'set' && rule.direction === 'down'
    const value = rule.change === 'percent' ? raw : Math.round(raw * 100)
    const { data } = await api.account
      .priceRule({ boardIds: [...picked], change: rule.change, value: down ? -value : value, roundToMinor: Number(rule.roundTo) * 100, faces: rule.faces === '1', dryRun })
      .send()

    setResult(data)

    return data
  }

  const runPreview = () => preview.run(async () => void (await send(true)))

  const runApply = () =>
    apply.run(async () => {
      const data = await send(false)

      return `${plural(data.changed, 'board')} repriced.`
    })

  return (
    <SettingsPage title="Change rates" description="Update rates for many boards at once. You'll see a preview before saving.">
      <Section title="The change">
        <Field label="How">
          <Select label="How" value={rule.change} onChange={set('change')} options={CHANGES} />
        </Field>
        {rule.change !== 'set' ? (
          <Field label="Direction">
            <Select label="Direction" value={rule.direction} onChange={set('direction')} options={[{ value: 'up', label: 'Up' }, { value: 'down', label: 'Down' }]} />
          </Field>
        ) : null}
        <Field label={rule.change === 'percent' ? 'Percent' : 'Amount'} hint={rule.change === 'percent' ? undefined : 'In each board’s own currency.'} error={preview.problem.fields.value || apply.problem.fields.value}>
          <Input value={rule.value} onChangeText={set('value')} keyboardType="decimal-pad" placeholder={rule.change === 'percent' ? '10' : '50000'} />
        </Field>
        <Field label="Round to the nearest">
          <Select label="Round to the nearest" value={rule.roundTo} onChange={set('roundTo')} options={ROUNDING.map((value) => ({ value, label: Number(value).toLocaleString() }))} />
        </Field>
        <Field label="Faces with their own rate">
          <Select label="Faces with their own rate" value={rule.faces} onChange={set('faces')} options={[{ value: '1', label: 'Change them too' }, { value: '0', label: 'Leave them' }]} />
        </Field>
        <Text variant="small">For boards with a guaranteed owner amount, we'll update that amount and adjust the listed rate to match.</Text>
      </Section>

      <Section title="Boards">
        {boards.length ? (
          <Text variant="link" accessibilityRole="button" onPress={pickAll}>
            {picked.size ? 'Pick none' : 'Pick all'}
          </Text>
        ) : (
          <Text variant="muted">{load.busy ? 'Loading…' : 'You have no boards yet.'}</Text>
        )}
        {load.problem.message ? <Callout>{load.problem.message}</Callout> : null}
        {boards.map((board) => (
          <View key={board.id} style={styles.board}>
            <CheckOption label={board.name} description={board.rate ? formatRate(board.rate)! : 'No rate'} checked={picked.has(board.id)} onPress={() => toggle(board.id)} />
            <PreviewLine board={board} row={result?.rows.find((entry) => entry.boardId === board.id)} />
          </View>
        ))}
        {page.current < page.last ? <Button title="Show more" variant="ghost" loading={more.busy} onPress={loadMore} /> : null}
      </Section>

      {preview.problem.summary || apply.problem.summary ? <Callout>{preview.problem.summary || apply.problem.summary}</Callout> : null}
      <View style={styles.actions}>
        <Button title="Preview" variant="secondary" loading={preview.busy} disabled={!picked.size || apply.busy} onPress={runPreview} style={styles.flex} />
        <Button title="Save new rates" loading={apply.busy} disabled={!picked.size || !result?.dryRun || preview.busy} onPress={runApply} style={styles.flex} />
      </View>
    </SettingsPage>
  )
}

/** What the preview would change a board's rate to, or why it was skipped. */
function PreviewLine({ board, row }: { board: Board; row?: PriceRuleResult['rows'][number] }) {
  if (!row) return null

  if (row.skipped) return <Text variant="small" style={styles.preview}>{row.skipped}</Text>

  if (row.beforeMinor === null || row.afterMinor === null) return null

  return (
    <View style={[styles.preview, styles.change]}>
      <Text style={styles.before}>{formatMoney(row.beforeMinor, board.currency)}</Text>
      <ArrowRight size={14} color={colors.ink500} />
      <Text style={styles.after}>{formatMoney(row.afterMinor, board.currency)}</Text>
      {row.ownerNet ? <Text variant="small">for the owner</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  board: { gap: 6 },
  preview: { paddingHorizontal: 14 },
  change: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  before: { fontSize: 14, color: colors.ink500, textDecorationLine: 'line-through' },
  after: { fontSize: 14, fontFamily: fonts.bold, color: colors.ink900 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
})
