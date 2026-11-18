import { StyleSheet, View } from 'react-native'
import Svg, { G, Path, Rect } from 'react-native-svg'
import { colors, fonts, shadows } from '@/theme'
import { Text } from '@/components/ui'

/** A drawn city map: water, parks, blocks and roads, to sit behind floating panels. Decoration only, as on the web. */
export function MapBackdrop() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 1280 900" preserveAspectRatio="xMidYMid slice">
      <Rect width="1280" height="900" fill="#eef0f2" />
      <Path d="M0 610 C 220 560, 420 650, 640 612 S 1020 540, 1280 586 L1280 900 L0 900 Z" fill="#cfdbe5" />
      <Path d="M760 0 C 790 180, 720 330, 800 470 S 880 600, 840 900" fill="none" stroke="#cfdbe5" strokeWidth={64} />
      <Path d="M300 330 h120 v90 h-120z M980 120 h150 v110 h-150z M120 690 h170 v80 h-170z" fill="#dde8dc" />
      <G fill="#e4e7ea">
        <Rect x="470" y="70" width="90" height="60" rx="6" />
        <Rect x="580" y="70" width="70" height="60" rx="6" />
        <Rect x="470" y="150" width="180" height="70" rx="6" />
        <Rect x="890" y="300" width="110" height="80" rx="6" />
        <Rect x="1020" y="300" width="120" height="80" rx="6" />
        <Rect x="560" y="400" width="140" height="90" rx="6" />
        <Rect x="1000" y="680" width="140" height="70" rx="6" />
        <Rect x="420" y="700" width="160" height="80" rx="6" />
      </G>
      <G fill="none" strokeLinecap="round">
        <Path d="M0 360 L1280 320" stroke="#dadde1" strokeWidth={26} />
        <Path d="M0 360 L1280 320" stroke="#ffffff" strokeWidth={20} />
        <Path d="M440 0 L520 900" stroke="#dadde1" strokeWidth={22} />
        <Path d="M440 0 L520 900" stroke="#ffffff" strokeWidth={16} />
        <Path d="M0 180 C 380 200, 700 150, 1280 220" stroke="#ffffff" strokeWidth={12} />
        <Path d="M660 0 C 680 260, 700 440, 760 900" stroke="#ffffff" strokeWidth={10} />
        <Path d="M980 0 L1060 900" stroke="#ffffff" strokeWidth={9} />
        <Path d="M0 500 L1280 470" stroke="#ffffff" strokeWidth={9} />
        <Path d="M140 740 C 420 770, 800 720, 1280 760" stroke="#f6e7b0" strokeWidth={14} />
      </G>
    </Svg>
  )
}

/** A price tag pinned to a point on the map. The tip of the tag sits on the point. */
export function MapPin({ label, active = false, dim = false }: { label: string; active?: boolean; dim?: boolean }) {
  return (
    <View style={[styles.pin, active ? styles.active : styles.idle, dim && styles.dim]}>
      <View style={[styles.dot, { backgroundColor: active ? colors.white : colors.available }]} />
      <Text style={[styles.label, active && styles.activeLabel]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pin: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 30, paddingHorizontal: 11, borderRadius: 999 },
  idle: { backgroundColor: colors.white, boxShadow: '0 2px 4px rgba(30,31,34,0.1), 0 8px 18px rgba(30,31,34,0.12)' },
  active: { backgroundColor: colors.brand500, boxShadow: `0 0 0 6px rgba(131,59,75,0.18), ${shadows.glow}` },
  dim: { opacity: 0.55 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: colors.ink900 },
  activeLabel: { color: colors.white },
})
