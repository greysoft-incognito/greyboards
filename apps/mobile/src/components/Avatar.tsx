import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { StyleSheet } from 'react-native'
import type { User } from '@greyboards/types'
import { Text } from '@/components/ui'
import { colors, fonts } from '@/theme'

/** The user's photo, or their initials on a wine gradient. */
export function Avatar({ user, size = 36 }: { user: Pick<User, 'name' | 'avatarUrl'>; size?: number }) {
  const box = { width: size, height: size, borderRadius: size / 2 }

  if (user.avatarUrl) return <Image source={{ uri: user.avatarUrl }} style={[box, styles.photo]} accessibilityLabel={user.name} />

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return (
    <LinearGradient colors={[colors.brand400, colors.brand700]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[box, styles.initials]} accessibilityLabel={user.name}>
      <Text style={[styles.letters, { fontSize: size * 0.38 }]}>{initials || '?'}</Text>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  photo: { backgroundColor: colors.surface200 },
  initials: { alignItems: 'center', justifyContent: 'center' },
  letters: { color: colors.white, fontFamily: fonts.bold },
})
