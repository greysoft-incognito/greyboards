import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Camera, CircleCheck, type LucideIcon, MapPinned } from 'lucide-react-native'
import { Button, Logo, Text } from '@/components/ui'
import { brandSweep, colors, fonts } from '@/theme'

const PROMISES: { icon: LucideIcon; text: string }[] = [
  { icon: MapPinned, text: 'Find boards anywhere on a live map' },
  { icon: Camera, text: 'See photo proof your ad went up' },
  { icon: CircleCheck, text: "Pay only when it's up" },
]

/** The first screen for visitors: the Greyboards promise and a way in. */
export default function Welcome() {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="light" />
      <LinearGradient colors={brandSweep} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />

      <Logo light />

      <View style={styles.copy}>
        <Text style={styles.headline}>Book it, see it, pay only when it's up.</Text>
        <View style={styles.promises}>
          {PROMISES.map((promise) => (
            <View key={promise.text} style={styles.promise}>
              <promise.icon size={20} color={colors.brand100} />
              <Text style={styles.promiseText}>{promise.text}</Text>
            </View>
          ))}
        </View>
        <View style={styles.actions}>
          <Button title="Get started" size="lg" variant="secondary" onPress={() => router.push('/signup')} />
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
  screen: { flex: 1, backgroundColor: colors.brand700, paddingHorizontal: 20, justifyContent: 'space-between', overflow: 'hidden' },
  copy: { gap: 20 },
  headline: { fontFamily: fonts.displayHeavy, fontSize: 34, lineHeight: 40, letterSpacing: -0.8, color: colors.white },
  promises: { gap: 12 },
  promise: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  promiseText: { fontSize: 16, lineHeight: 22, color: colors.brand50 },
  actions: { gap: 12, marginTop: 12 },
  about: { alignSelf: 'center', marginTop: 4, color: colors.white },
})
