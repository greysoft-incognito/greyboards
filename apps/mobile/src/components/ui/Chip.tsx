import type { ReactNode } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import { colors, fonts, radius } from '@/theme'
import { Text } from './Text'

/** A pill that can be picked, for filters and short choices. */
export function Chip({ label, selected = false, icon, onPress }: { label: string; selected?: boolean; icon?: ReactNode; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && !selected && styles.pressed]}
    >
      {icon}
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 38, paddingHorizontal: 14, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.surface200, backgroundColor: colors.white },
  selected: { borderColor: colors.brand500, backgroundColor: colors.brand50 },
  pressed: { backgroundColor: colors.surface100 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink700 },
  selectedLabel: { color: colors.brand700 },
})
