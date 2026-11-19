import { Pressable, StyleSheet, View } from 'react-native'
import { Check, type LucideIcon } from 'lucide-react-native'
import { Text } from './Text'
import { colors, fonts, radius } from '@/theme'

/** A checkbox row with a label and a line explaining it, with an optional icon and tag. Disabled rows show a fixed choice. */
export function CheckOption({
  label,
  description,
  checked,
  disabled,
  icon: Icon,
  tag,
  onPress,
}: {
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  icon?: LucideIcon
  tag?: string
  onPress?: () => void
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="checkbox" accessibilityState={{ checked, disabled }} style={[styles.option, checked && styles.optionOn, disabled && styles.optionFixed]}>
      <View style={[styles.box, checked && styles.boxOn]}>{checked && <Check size={14} strokeWidth={3} color={colors.white} />}</View>
      {Icon ? <Icon size={20} color={colors.brand600} style={styles.icon} /> : null}
      <View style={styles.flex}>
        <View style={styles.title}>
          <Text style={styles.optionLabel}>{label}</Text>
          {tag ? <Text style={styles.tag}>{tag}</Text> : null}
        </View>
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
  title: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  optionLabel: { fontFamily: fonts.semibold, color: colors.ink900 },
  tag: { fontSize: 11, lineHeight: 14, color: colors.ink500, backgroundColor: colors.surface100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full, overflow: 'hidden' },
  icon: { marginTop: 1 },
  box: { width: 20, height: 20, marginTop: 2, borderRadius: 5, borderWidth: 2, borderColor: colors.surface300, alignItems: 'center', justifyContent: 'center' },
  boxOn: { borderColor: colors.brand500, backgroundColor: colors.brand500 },
})
