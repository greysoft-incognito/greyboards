import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native'
import * as Location from 'expo-location'
import { LocateFixed, MapPin as MapPinIcon, SearchX, SlidersHorizontal } from 'lucide-react-native'
import type { Board, BoardKind, BoardKindDefinition } from '@greyboards/types'
import { BoardResult } from '@/components/boards/BoardResult'
import { EmptyState } from '@/components/EmptyState'
import { useTabBarInset } from '@/components/GlassTabBar'
import { MapBackdrop, MapPin } from '@/components/MapBackdrop'
import { Button, Callout, Chip, Select, Sheet, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { formatCompactMoney } from '@/lib/format'
import { currentSpot } from '@/lib/location'
import { colors, fonts, radius, shadows } from '@/theme'

/** Where the search starts without the phone's location: central Kaduna, where Greyboards goes live first. */
const KADUNA = { latitude: 10.5222, longitude: 7.4383, label: 'Kaduna' }

/** How far around the centre to look, in kilometres. */
const RADIUS_KM = 50

/** Price limits offered, in kobo. */
const PRICE_LIMITS = [25_000_000, 50_000_000, 100_000_000, 250_000_000, 500_000_000]

const MAP_HEIGHT = 300

/** Pins stay below the floating search bar. */
const PIN_AREA_TOP = 76

interface Filters {
  kind: BoardKind | null
  lit: boolean | null
  maxRateMinor: number | null
}

interface Centre {
  latitude: number
  longitude: number
  label: string
}

/** Places each board on the drawn map by its offset from the centre, scaled so they all fit under the search bar. */
function placePins(boards: Board[], centre: Centre, width: number, height: number) {
  const metresPerLng = Math.cos((centre.latitude * Math.PI) / 180) * 111_320
  const offsets = boards.map((board) => ({ id: board.id, x: (board.longitude - centre.longitude) * metresPerLng, y: (centre.latitude - board.latitude) * 110_540 }))
  const reachX = Math.max(400, ...offsets.map((offset) => Math.abs(offset.x)))
  const reachY = Math.max(400, ...offsets.map((offset) => Math.abs(offset.y)))
  const top = PIN_AREA_TOP + 34
  const middle = (top + height - 14) / 2
  const scale = Math.min((width / 2 - 56) / reachX, (height - 14 - top) / 2 / reachY)

  return Object.fromEntries(offsets.map((offset) => [offset.id, { left: width / 2 + offset.x * scale, top: middle + offset.y * scale }]))
}

/** Advertisers find boards: a drawn map of the nearest listed boards with their prices, and the list under it. */
export default function Find() {
  const inset = useTabBarInset()
  const { width } = useWindowDimensions()
  const list = useRef<FlatList<Board>>(null)
  const [centre, setCentre] = useState<Centre>(KADUNA)
  const [filters, setFilters] = useState<Filters>({ kind: null, lit: null, maxRateMinor: null })
  const [kinds, setKinds] = useState<BoardKindDefinition[]>([])
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [locating, setLocating] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const pins = useMemo(() => placePins(boards, centre, width, MAP_HEIGHT), [boards, centre, width])
  const activeFilters = [filters.kind, filters.lit, filters.maxRateMinor].filter((value) => value !== null).length

  const load = useCallback(async () => {
    setLoading(true)
    setProblem(null)

    try {
      const result = await api
        .boards({
          lat: centre.latitude,
          lng: centre.longitude,
          radiusKm: RADIUS_KM,
          per_page: 30,
          ...(filters.kind ? { kind: filters.kind } : {}),
          ...(filters.lit !== null ? { lit: filters.lit } : {}),
          ...(filters.maxRateMinor ? { maxRateMinor: filters.maxRateMinor } : {}),
        })
        .send()

      setBoards(result.data)
      setSelected(null)
    } catch (error) {
      setProblem(FormProblem.from(error).message)
    } finally {
      setLoading(false)
    }
  }, [centre, filters])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    api
      .boardKinds()
      .send()
      .then(({ data }) => setKinds(data))
      .catch(() => undefined)

    Location.getForegroundPermissionsAsync()
      .then(async (permission) => {
        if (!permission.granted) return

        const last = await Location.getLastKnownPositionAsync()

        if (last) setCentre({ latitude: last.coords.latitude, longitude: last.coords.longitude, label: 'you' })
      })
      .catch(() => undefined)
  }, [])

  const nearMe = async () => {
    setLocating(true)

    try {
      const spot = await currentSpot()

      setCentre({ latitude: spot.latitude, longitude: spot.longitude, label: 'you' })
    } catch (error) {
      setProblem(FormProblem.from(error).message)
    } finally {
      setLocating(false)
    }
  }

  const pick = (id: string) => {
    const index = boards.findIndex((board) => board.id === id)

    setSelected(id)
    if (index >= 0) list.current?.scrollToIndex({ index, viewOffset: 12, animated: true })
  }

  const map = (
    <View style={styles.mapFrame}>
      <View style={styles.map}>
        <MapBackdrop />
        {centre.label === 'you' ? <View style={[styles.you, { left: width / 2 - 9, top: (PIN_AREA_TOP + 34 + MAP_HEIGHT - 14) / 2 - 9 }]} /> : null}
        {boards.map((board) => {
          const at = pins[board.id]

          if (!at || !board.rate) return null

          return (
            <Pressable
              key={board.id}
              accessibilityRole="button"
              accessibilityLabel={`${board.name}, ${formatCompactMoney(board.rate.amountMinor, board.rate.currency)}`}
              onPress={() => pick(board.id)}
              style={[styles.pinSpot, { left: at.left, top: at.top }, selected === board.id && styles.pinOnTop]}
            >
              <MapPin label={formatCompactMoney(board.rate.amountMinor, board.rate.currency)} active={selected === board.id} dim={!!selected && selected !== board.id} />
            </Pressable>
          )
        })}
        <View style={styles.searchBar}>
          <MapPinIcon size={18} color={colors.brand600} />
          <View style={styles.flex}>
            <Text style={styles.searchTitle}>Boards near {centre.label}</Text>
            <Text variant="small">{loading ? 'Looking…' : `${boards.length} within ${RADIUS_KM} km`}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Filters" onPress={() => setShowFilters(true)} style={styles.filterButton}>
            <SlidersHorizontal size={18} color={colors.ink900} />
            {activeFilters ? (
              <View style={styles.count}>
                <Text style={styles.countText}>{activeFilters}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Boards near me" onPress={nearMe} disabled={locating} style={styles.locate}>
          {locating ? <ActivityIndicator size="small" color={colors.brand600} /> : <LocateFixed size={20} color={colors.brand600} />}
        </Pressable>
      </View>
      {problem ? <Callout>{problem}</Callout> : null}
    </View>
  )

  return (
    <>
      <FlatList
        ref={list}
        style={styles.screen}
        contentContainerStyle={[styles.page, { paddingBottom: 32 + inset }]}
        data={boards}
        keyExtractor={(board) => board.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <BoardResult board={item} active={item.id === selected} />
          </View>
        )}
        onScrollToIndexFailed={() => undefined}
        ListHeaderComponent={map}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.brand600} style={styles.loading} />
          ) : (
            <EmptyState icon={SearchX} title="No boards here yet" text="Try fewer filters, or look somewhere else. New boards go up every week.">
              {activeFilters ? <Button title="Clear filters" variant="secondary" onPress={() => setFilters({ kind: null, lit: null, maxRateMinor: null })} /> : null}
            </EmptyState>
          )
        }
      />

      <Sheet visible={showFilters} title="Filter boards" onClose={() => setShowFilters(false)}>
        <Text variant="label">Kind</Text>
        <Select
          label="Kind of board"
          value={filters.kind ?? 'any'}
          options={[{ value: 'any', label: 'Any kind' }, ...kinds.map((kind) => ({ value: kind.kind, label: kind.label }))]}
          onChange={(value) => setFilters((current) => ({ ...current, kind: value === 'any' ? null : (value as BoardKind) }))}
        />
        <Text variant="label">Lighting</Text>
        <View style={styles.chips}>
          {(
            [
              [null, 'Any'],
              [true, 'Lit at night'],
              [false, 'Not lit'],
            ] as const
          ).map(([value, label]) => (
            <Chip key={label} label={label} selected={filters.lit === value} onPress={() => setFilters((current) => ({ ...current, lit: value }))} />
          ))}
        </View>
        <Text variant="label">Price up to</Text>
        <View style={styles.chips}>
          <Chip label="Any price" selected={filters.maxRateMinor === null} onPress={() => setFilters((current) => ({ ...current, maxRateMinor: null }))} />
          {PRICE_LIMITS.map((limit) => (
            <Chip key={limit} label={formatCompactMoney(limit)} selected={filters.maxRateMinor === limit} onPress={() => setFilters((current) => ({ ...current, maxRateMinor: limit }))} />
          ))}
        </View>
        <Button title={loading ? 'Looking…' : `Show ${boards.length === 1 ? '1 board' : `${boards.length} boards`}`} onPress={() => setShowFilters(false)} />
      </Sheet>
    </>
  )
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.canvas },
  page: { paddingBottom: 32 },
  flex: { flex: 1 },
  mapFrame: { gap: 12, marginBottom: 12 },
  map: { height: MAP_HEIGHT, overflow: 'hidden', borderBottomLeftRadius: radius.xl + 6, borderBottomRightRadius: radius.xl + 6, boxShadow: shadows.card },
  you: { position: 'absolute', width: 18, height: 18, borderRadius: 9, borderWidth: 3, borderColor: colors.white, backgroundColor: '#2563eb', boxShadow: '0 0 0 8px rgba(37,99,235,0.18)' },
  pinSpot: { position: 'absolute', transform: [{ translateX: '-50%' }, { translateY: '-100%' }], zIndex: 1 },
  pinOnTop: { zIndex: 2 },
  searchBar: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    boxShadow: shadows.raised,
  },
  searchTitle: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.ink900 },
  filterButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  count: { position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand500 },
  countText: { fontSize: 10, lineHeight: 12, fontFamily: fonts.bold, color: colors.white },
  locate: { position: 'absolute', right: 14, bottom: 14, zIndex: 3, width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, boxShadow: shadows.raised },
  item: { paddingHorizontal: 16, paddingBottom: 10 },
  loading: { marginTop: 32 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
