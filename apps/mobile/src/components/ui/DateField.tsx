import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native'
import { formatDay } from '@/lib/format'
import { colors, fonts, radius, surfaces } from '@/theme'
import { Sheet } from './Sheet'
import { Text } from './Text'

/** Days that can't be picked, as inclusive 'YYYY-MM-DD' runs. */
export interface DayRange {
  startsOn: string
  endsOn: string
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/** A calendar day as 'YYYY-MM-DD', counted in UTC so it never shifts with the phone's time zone. */
const dayString = (date: Date) => date.toISOString().slice(0, 10)

/** The days of a month, padded to start on Monday. */
function monthDays(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1))
  const lead = (first.getUTCDay() + 6) % 7
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

  return [...Array.from({ length: lead }, () => null), ...Array.from({ length: count }, (_, index) => dayString(new Date(Date.UTC(year, month, index + 1))))]
}

/** A field that shows a day and opens a month calendar to pick another. Days before `min` or inside `taken` can't be picked. */
export function DateField({ label, value, min, taken = [], onChange }: { label: string; value: string; min?: string; taken?: DayRange[]; onChange: (day: string) => void }) {
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(() => {
    const date = new Date(`${value}T00:00:00Z`)

    return { year: date.getUTCFullYear(), month: date.getUTCMonth() }
  })
  const days = useMemo(() => monthDays(shown.year, shown.month), [shown])
  const title = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(shown.year, shown.month, 1)))
  const blocked = (day: string) => (min !== undefined && day < min) || taken.some((run) => day >= run.startsOn && day <= run.endsOn)

  const move = (by: number) => setShown((current) => ({ year: current.year + Math.floor((current.month + by) / 12), month: (((current.month + by) % 12) + 12) % 12 }))

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${formatDay(value)}`} onPress={() => setOpen(true)} style={({ pressed }) => [styles.field, pressed && styles.pressed]}>
        <CalendarDays size={18} color={colors.ink500} />
        <Text style={styles.value}>{formatDay(value)}</Text>
      </Pressable>
      <Sheet visible={open} title={label} onClose={() => setOpen(false)}>
        <View style={styles.head}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => move(-1)} style={styles.arrow}>
            <ChevronLeft size={20} color={colors.ink900} />
          </Pressable>
          <Text style={styles.month}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => move(1)} style={styles.arrow}>
            <ChevronRight size={20} color={colors.ink900} />
          </Pressable>
        </View>
        <View style={styles.grid}>
          {WEEKDAYS.map((weekday, index) => (
            <Text key={`${weekday}${index}`} variant="small" style={styles.weekday}>
              {weekday}
            </Text>
          ))}
          {days.map((day, index) =>
            day ? (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityLabel={formatDay(day)}
                accessibilityState={{ disabled: blocked(day), selected: day === value }}
                disabled={blocked(day)}
                onPress={() => {
                  onChange(day)
                  setOpen(false)
                }}
                style={styles.cell}
              >
                <View style={[styles.day, day === value && styles.chosen]}>
                  <Text style={[styles.dayText, blocked(day) && styles.blocked, day === value && styles.chosenText]}>{Number(day.slice(8))}</Text>
                </View>
              </Pressable>
            ) : (
              <View key={`pad${index}`} style={styles.cell} />
            ),
          )}
        </View>
        {taken.length ? <Text variant="small">Faded days are booked, kept or open for bids.</Text> : null}
      </Sheet>
    </>
  )
}

const styles = StyleSheet.create({
  field: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, ...surfaces.field },
  pressed: { borderColor: colors.ink500 },
  value: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },
  month: { fontFamily: fonts.display, fontSize: 17, color: colors.ink900 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', paddingVertical: 6 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3 },
  day: { flex: 1, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  chosen: { backgroundColor: colors.brand500, boxShadow: '0 6px 14px rgba(131,59,75,0.3)' },
  dayText: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink900 },
  blocked: { color: colors.surface300, textDecorationLine: 'line-through' },
  chosenText: { color: colors.white, fontFamily: fonts.bold },
})
