import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Camera, CircleCheck, type LucideIcon, MapPinned } from 'lucide-react-native'
import { BoardScene } from '@/components/BoardScene'
import { Button, Logo, Text } from '@/components/ui'
import { colors, fonts, radius } from '@/theme'

const PROMISES: { icon: LucideIcon; text: string }[] = [
  { icon: MapPinned, text: 'Find boards anywhere on a live map' },
  { icon: Camera, text: 'See photo proof your ad went up' },
  { icon: CircleCheck, text: "Pay only when it's up" },
]

/** The first screen for visitors: a board at dusk, the Greyboards promise and a way in. */
export default function Welcome() {
  const insets = useSafeAreaInsets()

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={[styles.top, { paddingTop: insets.top }]}>
        <View style={styles.hero}>
          <BoardScene time="dusk" art="brand" headline="Your ad here" />
        </View>
        <View style={[styles.logo, { top: insets.top + 12 }]}>
          <Logo size={24} />
        </View>
      </View>

      <View style={[styles.copy, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.headline}>Book it, see it, pay only when it's up.</Text>
        <View style={styles.promises}>
          {PROMISES.map((promise) => (
            <View key={promise.text} style={styles.promise}>
              <View style={styles.promiseIcon}>
                <promise.icon size={16} color={colors.brand100} />
              </View>
              <Text style={styles.promiseText}>{promise.text}</Text>
            </View>
          ))}
        </View>
        <View style={styles.actions}>
          <Button title="Get started" size="lg" onPress={() => router.push('/signup')} />
          <Button title="I have an account" size="lg" variant="glass" onPress={() => router.push('/signin')} />
          <Text variant="link" accessibilityRole="button" style={styles.about} onPress={() => router.push({ pathname: '/pages/[slug]', params: { slug: 'about' } })}>
            How Greyboards works
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#2a2229' },
  top: { backgroundColor: '#3d2c4d' },
  hero: { width: '100%', aspectRatio: 400 / 260, overflow: 'hidden' },
  logo: {
    position: 'absolute',
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.88)',
    boxShadow: '0 10px 30px rgba(30,31,34,0.12)',
  },
  copy: { flex: 1, justifyContent: 'flex-end', gap: 20, paddingHorizontal: 20, paddingTop: 8 },
  headline: { fontFamily: fonts.displayHeavy, fontSize: 32, lineHeight: 38, letterSpacing: -1, color: colors.white },
  promises: { gap: 10 },
  promise: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  promiseIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  promiseText: { fontSize: 15, lineHeight: 22, color: colors.brand50 },
  actions: { gap: 12, marginTop: 8 },
  about: { alignSelf: 'center', marginTop: 4, color: colors.white },
})
