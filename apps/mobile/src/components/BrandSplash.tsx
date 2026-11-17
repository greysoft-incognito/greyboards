import { useEffect, useRef, useState } from 'react'
import { Animated, Image, StyleSheet } from 'react-native'
import { SplashScreen } from 'expo-router'
import { colors } from '@/theme'

/**
 * The launch screen drawn in the app. It takes over from the native splash with the mark at the
 * same size and place, and fades away when `done` turns true.
 */
export function BrandSplash({ done }: { done: boolean }) {
  const opacity = useRef(new Animated.Value(1)).current
  const [gone, setGone] = useState(false)

  useEffect(() => {
    if (!done) return

    Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setGone(true))
  }, [done, opacity])

  if (gone) return null

  return (
    <Animated.View pointerEvents="none" style={[styles.screen, { opacity }]} onLayout={() => SplashScreen.hideAsync()}>
      <Image source={require('../../assets/splash-icon.png')} style={styles.mark} />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  // The native splash's background colour in app.json.
  screen: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },
  // Matches `imageWidth` of the expo-splash-screen plugin in app.json.
  mark: { width: 200, height: 200 },
})
