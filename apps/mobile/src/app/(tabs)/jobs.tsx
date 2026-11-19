import { useCallback, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Printer } from 'lucide-react-native'
import type { PrintJob } from '@greyboards/types'
import { missingWords } from '@/components/AccountRoles'
import { EmptyState } from '@/components/EmptyState'
import { useTabBarInset } from '@/components/GlassTabBar'
import { JobRow } from '@/components/jobs/JobBits'
import { Segmented } from '@/components/Segmented'
import { Button, Callout, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { currentSpot, type Spot } from '@/lib/location'
import { useUser } from '@/lib/session'
import { colors } from '@/theme'

type View_ = 'near' | 'mine'

/** Dispatchers find open print jobs near them, and follow the ones they took. */
export default function Jobs() {
  const inset = useTabBarInset()
  const role = useUser().accountRoles.find((held) => held.kind === 'dispatch')
  const [view, setView] = useState<View_>('near')
  const [spot, setSpot] = useState<Spot | null>(null)
  const [jobs, setJobs] = useState<PrintJob[]>([])
  const [page, setPage] = useState({ current: 0, last: 1 })
  const [loading, setLoading] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const active = role?.status === 'active'

  const load = useCallback(
    async (next: number, where: Spot | null = spot) => {
      if (!active) return

      setLoading(true)
      setProblem(null)

      try {
        if (view === 'mine') {
          const result = await api.printJobs.mine({ page: next }).send()

          setJobs((shown) => (next === 1 ? result.data : [...shown, ...result.data]))
          setPage({ current: result.meta.current_page, last: result.meta.last_page })
        } else if (where) {
          setJobs((await api.printJobs.near({ lat: where.latitude, lng: where.longitude }).send()).data)
          setPage({ current: 1, last: 1 })
        } else {
          setJobs([])
        }
      } catch (error) {
        setProblem(FormProblem.from(error).message)
      } finally {
        setLoading(false)
      }
    },
    [active, view, spot],
  )

  useFocusEffect(
    useCallback(() => {
      load(1)
    }, [load]),
  )

  const findMe = async () => {
    setLoading(true)
    setProblem(null)

    try {
      const where = await currentSpot()

      setSpot(where)
      await load(1, where)
    } catch (error) {
      setProblem(FormProblem.from(error).message)
      setLoading(false)
    }
  }

  const more = () => {
    if (!loading && view === 'mine' && page.current < page.last) load(page.current + 1)
  }

  const empty = !active ? (
    <EmptyState
      icon={Printer}
      title={role?.status === 'pending' ? (role.missing.length ? 'Almost there' : 'Being checked') : 'For dispatchers'}
      text={
        role?.status === 'pending'
          ? role.missing.length
            ? `Add ${missingWords(role.missing)} so we can approve you as a dispatcher. Jobs will show up here once you’re in.`
            : 'We’re reviewing your dispatcher application. Jobs will show up here once you’re approved.'
          : 'Become a dispatcher to print and put up ads near you.'
      }
    >
      {role?.status !== 'pending' ? <Button title="Become a dispatcher" variant="secondary" onPress={() => router.push('/settings/roles')} /> : null}
      {role?.status === 'pending' && role.missing.length ? <Button title="Finish your application" variant="secondary" onPress={() => router.push('/settings/roles')} /> : null}
    </EmptyState>
  ) : view === 'near' && !spot ? (
    <EmptyState icon={Printer} title="Jobs near you" text="Print jobs near you, closest first. We only use your location for this search.">
      <Button title={loading ? 'Finding your location…' : 'Find jobs near me'} loading={loading} onPress={findMe} />
    </EmptyState>
  ) : loading ? undefined : (
    <EmptyState
      icon={Printer}
      title={view === 'mine' ? 'No jobs yet' : 'Nothing nearby'}
      text={view === 'mine' ? 'Jobs you reserve will show up here.' : 'No jobs near you right now. Check back soon.'}
    />
  )

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={[styles.page, { paddingBottom: 32 + inset }, !jobs.length && styles.grow]}
      data={active ? jobs : []}
      keyExtractor={(job) => job.id}
      renderItem={({ item }) => <JobRow job={item} />}
      onEndReached={more}
      onEndReachedThreshold={0.4}
      refreshControl={<RefreshControl refreshing={loading && page.current <= 1} onRefresh={() => (view === 'near' && spot ? findMe() : load(1))} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text variant="display">Print jobs</Text>
            <Text variant="muted">{view === 'mine' ? 'Your jobs, soonest first.' : 'Ads near you that need printing and putting up.'}</Text>
          </View>
          {active ? (
            <Segmented<View_>
              options={[
                { value: 'near', label: 'Near me' },
                { value: 'mine', label: 'My jobs' },
              ]}
              value={view}
              onChange={(next) => {
                setJobs([])
                setView(next)
              }}
            />
          ) : null}
          {active && view === 'near' && spot ? <Button title="Search from where I am now" variant="secondary" loading={loading} onPress={findMe} /> : null}
          {active ? <Button title="Your rates" variant="ghost" onPress={() => router.push('/jobs/prices')} /> : null}
          {problem ? <Callout>{problem}</Callout> : null}
        </View>
      }
      ListEmptyComponent={empty}
    />
  )
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.canvas },
  page: { padding: 16, gap: 12 },
  grow: { flexGrow: 1 },
  header: { gap: 14, marginBottom: 4 },
  flex: { gap: 4 },
})
