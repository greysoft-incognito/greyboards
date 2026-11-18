import { useCallback, useState } from 'react'
import { ActivityIndicator, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { UsersRound } from 'lucide-react-native'
import type { SharedBooking } from '@greyboards/types'
import { SharedBookingCard } from '@/components/bookings/SharedBookingCard'
import { EmptyState } from '@/components/EmptyState'
import { SettingsPage } from '@/components/settings/SettingsPage'
import { Callout } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { useUser } from '@/lib/session'
import { colors } from '@/theme'

/** Shared boards anyone can join before they're full, or bid for whole once their lock ends. */
export default function OpenShares() {
  const canJoin = useUser().accountRoles.some((role) => role.kind === 'advertiser' && role.status === 'active')
  const [shared, setShared] = useState<SharedBooking[] | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      setShared((await api.openShares().send()).data)
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

  return (
    <SettingsPage
      title="Shared boards"
      description="Join others on a board for the same days and pay only your share. Once a sharing’s lock ends with shares unpaid, the whole board goes up for bids."
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      {problem ? <Callout>{problem}</Callout> : null}
      {shared === null ? (
        problem ? null : <ActivityIndicator color={colors.brand600} />
      ) : shared.length ? (
        shared.map((entry) => <SharedBookingCard key={entry.id} shared={entry} showBoard canJoin={canJoin} onChange={load} />)
      ) : (
        <EmptyState icon={UsersRound} title="Nothing shared yet" text="When someone shares a board, it shows here until every share is taken." />
      )}
    </SettingsPage>
  )
}
