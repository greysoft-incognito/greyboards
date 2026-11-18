import { StyleSheet, View } from 'react-native'
import { fonts, radius } from '@/theme'
import { Text } from './Text'

export interface PillLook {
  label: string
  background: string
  color: string
}

/** A small status badge with a dot. */
export function Pill({ label, background, color }: PillLook) {
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bold },
})
