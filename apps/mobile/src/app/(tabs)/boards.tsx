import { useCallback, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Presentation } from 'lucide-react-native'
import type { Board } from '@greyboards/types'
import { BoardRow } from '@/components/boards/BoardBits'
import { EmptyState } from '@/components/EmptyState'
import { useTabBarInset } from '@/components/GlassTabBar'
import { Button, Callout, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { useUser } from '@/lib/session'
import { FormProblem } from '@/lib/forms'
import { colors } from '@/theme'

/** Boards the account tagged or owns, newest first, a page at a time, with a way to tag another. */
export default function Boards() {
  const inset = useTabBarInset()
  const scouts = useUser().accountRoles.some((role) => role.kind === 'scout' && role.status === 'active')
  const [boards, setBoards] = useState<Board[]>([])
  const [page, setPage] = useState({ current: 0, last: 1 })
  const [loading, setLoading] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const load = useCallback(async (next: number) => {
    setLoading(true)
    setProblem(null)

    try {
      const result = await api.account.boards({ page: next }).send()

      setBoards((shown) => (next === 1 ? result.data : [...shown, ...result.data]))
      setPage({ current: result.meta.current_page, last: result.meta.last_page })
    } catch (error) {
      setProblem(FormProblem.from(error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load(1)
    }, [load]),
  )

  const more = () => {
    if (!loading && page.current < page.last) load(page.current + 1)
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={[styles.page, { paddingBottom: 32 + inset }, !boards.length && styles.grow]}
      data={boards}
      keyExtractor={(board) => board.id}
      renderItem={({ item }) => <BoardRow board={item} />}
      onEndReached={more}
      onEndReachedThreshold={0.4}
      refreshControl={<RefreshControl refreshing={loading && page.current <= 1} onRefresh={() => load(1)} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text variant="display">Boards</Text>
            <Text variant="muted">Boards you’ve added.</Text>
          </View>
          <Button title="Tag a board" onPress={() => router.push('/boards/new')} />
          {boards.length > 1 ? <Button title="Change rates" variant="secondary" onPress={() => router.push('/boards/prices')} /> : null}
          {scouts ? <Button title="Pipeline" variant="secondary" onPress={() => router.push('/boards/pipeline')} /> : null}
          {problem ? <Callout>{problem}</Callout> : null}
        </View>
      }
      ListEmptyComponent={
        loading ? undefined : (
          <EmptyState icon={Presentation} title="No boards yet" text="Stand next to a board and tap Tag a board. We’ll use your location to place it.">
            <Button title="Tag your first board" variant="secondary" onPress={() => router.push('/boards/new')} />
          </EmptyState>
        )
      }
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
