import { StyleSheet, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { colors, fonts } from '@/theme'
import { Text } from './Text'

/** The Greysoft four-circle mark, the top right circle in wine. */
export function LogoMark({ size = 32, light = false }: { size?: number; light?: boolean }) {
  const grey = light ? 'rgba(255,255,255,0.85)' : '#727376'
  const wine = light ? colors.white : '#833b4b'

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx="15.75" cy="15.75" r="13.75" fill={grey} />
      <Circle cx="48.25" cy="15.75" r="13.75" fill={wine} />
      <Circle cx="15.75" cy="48.25" r="13.75" fill={grey} />
      <Circle cx="48.25" cy="48.25" r="13.75" fill={grey} />
    </Svg>
  )
}

/** The mark with the "Greyboards" wordmark. */
export function Logo({ light = false, size = 32 }: { light?: boolean; size?: number }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Greyboards" style={styles.row}>
      <LogoMark size={size} light={light} />
      <Text style={[styles.word, { fontSize: size * 0.6, color: light ? colors.white : colors.ink900 }]}>Greyboards</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  word: { fontFamily: fonts.display, letterSpacing: -0.4 },
})
