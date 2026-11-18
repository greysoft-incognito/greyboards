import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Compass, Navigation } from 'lucide-react-native'
import { Button, Callout, Text } from '@/components/ui'
import { watchHeading } from '@/lib/location'
import { formatHeading } from './BoardBits'
import { colors } from '@/theme'

/** The way a board faces is the opposite of where the phone points while you face the board. */
const facingFrom = (phone: number) => (phone + 180) % 360

/**
 * Records which way a board faces. The person stands in front of the board and points the
 * phone at it; the compass reading, turned around, is the board's heading.
 */
export function HeadingPicker({ value, onChange }: { value: number | null; onChange: (degrees: number | null) => void }) {
  const [live, setLive] = useState<number | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const stop = useRef<(() => void) | null>(null)

  useEffect(() => {
    let cancelled = false

    watchHeading((degrees) => !cancelled && setLive(degrees))
      .then((remove) => (cancelled ? remove() : (stop.current = remove)))
      .catch((error: Error) => !cancelled && setProblem(error.message))

    return () => {
      cancelled = true
      stop.current?.()
    }
  }, [])

  const shown = value ?? (live === null ? null : facingFrom(live))

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.dial}>
          {shown === null ? <Compass size={22} color={colors.ink500} /> : <Navigation size={22} color={colors.brand600} style={{ transform: [{ rotate: `${shown}deg` }] }} />}
        </View>
        <View style={styles.flex}>
          <Text variant="label">{value !== null ? `${formatHeading(value)} (${value}°)` : shown !== null ? `${formatHeading(shown)} (${shown}°)` : 'Waiting for the compass…'}</Text>
          <Text variant="small">{value !== null ? 'Saved. If it looks wrong, point again and reset.' : 'Face the board and point the top of your phone at it.'}</Text>
        </View>
      </View>
      {problem ? <Callout>{problem}</Callout> : null}
      {value === null ? (
        <Button title="Set the direction" variant="secondary" disabled={live === null} onPress={() => live !== null && onChange(facingFrom(live))} />
      ) : (
        <Button title="Reset" variant="ghost" onPress={() => onChange(null)} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dial: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand50, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
})
