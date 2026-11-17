import { Pressable, StyleSheet, View } from 'react-native'
import { Check } from 'lucide-react-native'
import { Text } from './Text'
import { colors, fonts, radius } from '@/theme'

/** A checkbox row with a label and a line explaining it. Disabled rows show a fixed choice. */
export function CheckOption({ label, description, checked, disabled, onPress }: { label: string; description: string; checked: boolean; disabled?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="checkbox" accessibilityState={{ checked, disabled }} style={[styles.option, checked && styles.optionOn, disabled && styles.optionFixed]}>
      <View style={[styles.box, checked && styles.boxOn]}>{checked && <Check size={14} strokeWidth={3} color={colors.white} />}</View>
      <View style={styles.flex}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text variant="muted">{description}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  option: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: radius.lg, borderWidth: 1.5, borderColor: 'transparent', backgroundColor: colors.canvas },
  optionOn: { borderColor: colors.brand500, backgroundColor: colors.brand50, boxShadow: '0 0 0 4px rgba(131,59,75,0.10)' },
  optionFixed: { backgroundColor: colors.surface100 },
  optionLabel: { fontFamily: fonts.semibold, color: colors.ink900 },
  box: { width: 20, height: 20, marginTop: 2, borderRadius: 5, borderWidth: 2, borderColor: colors.surface300, alignItems: 'center', justifyContent: 'center' },
  boxOn: { borderColor: colors.brand500, backgroundColor: colors.brand500 },
})
