import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, Share, StyleSheet, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { ExternalLink, FileChartColumn, Link2, Share2, Trash2 } from 'lucide-react-native'
import type { Booking, CampaignReportSummary } from '@greyboards/types'
import { EmptyState } from '@/components/EmptyState'
import { Section, SettingsPage } from '@/components/settings/SettingsPage'
import { Button, Callout, CheckOption, Field, Input, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { formatDay, formatDays, plural } from '@/lib/format'
import { useAction } from '@/lib/use-action'
import { colors, fonts, radius } from '@/theme'

/** The advertiser's campaign reports, and a form to make one from bookings whose ads went up. */
export default function Reports() {
  const [reports, setReports] = useState<CampaignReportSummary[] | null>(null)
  const [page, setPage] = useState({ current: 0, last: 1 })
  const [bookings, setBookings] = useState<Booking[]>([])
  const [problem, setProblem] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const more = useAction()

  const load = useCallback(async () => {
    try {
      const [list, ready] = await Promise.all([api.reports.list().send(), api.reports.bookings({ per_page: 100 }).send()])

      setReports(list.data)
      setPage({ current: list.meta.current_page, last: list.meta.last_page })
      setBookings(ready.data)
      setProblem(null)
    } catch (error) {
      setProblem(FormProblem.from(error).message)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const refresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const loadMore = () =>
    more.run(async () => {
      const list = await api.reports.list({ page: page.current + 1 }).send()

      setReports((shown) => [...(shown ?? []), ...list.data])
      setPage({ current: list.meta.current_page, last: list.meta.last_page })
    })

  return (
    <SettingsPage
      title="Campaign reports"
      description="Group bookings into one page with every board, its dates and the proof photos. Share the link, or save it as a PDF from the page."
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      {problem ? <Callout>{problem}</Callout> : null}
      {!reports ? (
        problem ? null : <ActivityIndicator color={colors.brand600} />
      ) : (
        <>
          {reports.length ? (
            reports.map((report) => <ReportCard key={report.id} report={report} onChange={load} />)
          ) : (
            <EmptyState icon={FileChartColumn} title="No reports yet" text="Make one from your bookings below once their ads are up." />
          )}
          {page.current < page.last ? <Button title="Show more" variant="ghost" loading={more.busy} onPress={loadMore} /> : null}
          <NewReport bookings={bookings} onCreated={load} />
        </>
      )}
    </SettingsPage>
  )
}

/** One report: open it, share its link, make a new link, or delete it. */
function ReportCard({ report, onChange }: { report: CampaignReportSummary; onChange: () => void }) {
  const action = useAction()
  const [deleting, setDeleting] = useState(false)

  const relink = () =>
    action.run(async () => {
      await api.reports.relink(report.id).send()
      onChange()

      return 'New link made. The old one no longer works.'
    })

  const remove = () =>
    action.run(async () => {
      await api.reports.remove(report.id).send()
      onChange()

      return 'Report deleted.'
    })

  return (
    <Section>
      <Pressable accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(report.link).catch(() => undefined)} style={styles.head}>
        <View style={styles.icon}>
          <FileChartColumn size={20} color={colors.brand600} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.title}>{report.title}</Text>
          <Text variant="small">
            {plural(report.bookings, 'booking')} · made {formatDay(report.createdAt.slice(0, 10))}
          </Text>
        </View>
        <ExternalLink size={18} color={colors.ink500} />
      </Pressable>
      {deleting ? (
        <View style={styles.actions}>
          <Button title="Delete this report" variant="danger" loading={action.busy} onPress={remove} />
          <Button title="Keep it" variant="ghost" onPress={() => setDeleting(false)} />
        </View>
      ) : (
        <View style={styles.actions}>
          <IconAction icon={Share2} label="Share link" onPress={() => Share.share({ message: `${report.title}\n${report.link}`, url: report.link }).catch(() => undefined)} />
          <IconAction icon={Link2} label="New link" disabled={action.busy} onPress={relink} />
          <IconAction icon={Trash2} label="Delete" danger onPress={() => setDeleting(true)} />
        </View>
      )}
      {action.problem.message ? <Callout>{action.problem.message}</Callout> : null}
    </Section>
  )
}

function IconAction({ icon: Icon, label, danger, disabled, onPress }: { icon: typeof Share2; label: string; danger?: boolean; disabled?: boolean; onPress: () => void }) {
  const tint = danger ? colors.red700 : colors.ink700

  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.iconAction, pressed && styles.pressed]}>
      <Icon size={16} color={tint} />
      <Text style={[styles.actionLabel, { color: tint }]}>{label}</Text>
    </Pressable>
  )
}

/** Pick a title and the bookings to put in a new report. */
function NewReport({ bookings, onCreated }: { bookings: Booking[]; onCreated: () => void }) {
  const action = useAction()
  const [title, setTitle] = useState('')
  const [picked, setPicked] = useState<string[]>([])

  const toggle = (id: string) => setPicked((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]))

  const create = () =>
    action.run(async () => {
      await api.reports.create({ title: title.trim(), bookingIds: picked }).send()
      setTitle('')
      setPicked([])
      onCreated()

      return 'Report ready to share.'
    })

  return (
    <Section title="New report">
      {bookings.length ? (
        <>
          <Field label="Title" error={action.problem.fields.title}>
            <Input value={title} onChangeText={setTitle} maxLength={120} placeholder="Such as: Kaduna launch, November" />
          </Field>
          <Text variant="label">Bookings</Text>
          {bookings.map((booking) => (
            <CheckOption key={booking.id} label={booking.board?.name ?? 'Board'} description={formatDays(booking)} checked={picked.includes(booking.id)} onPress={() => toggle(booking.id)} />
          ))}
          {action.problem.message && !action.problem.fields.title ? <Callout>{action.problem.message}</Callout> : null}
          <Button title="Make report" loading={action.busy} disabled={title.trim().length < 3 || !picked.length} onPress={create} />
        </>
      ) : (
        <Text variant="muted">Reports hold bookings whose ads went up. Once a proof is accepted, the booking shows here.</Text>
      )}
    </Section>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand50 },
  title: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink900 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconAction: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surface100 },
  pressed: { opacity: 0.7 },
  actionLabel: { fontFamily: fonts.semibold, fontSize: 13 },
})
