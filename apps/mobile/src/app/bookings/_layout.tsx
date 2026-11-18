import { Stack } from 'expo-router'
import { colors } from '@/theme'

export default function BookingsLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />
}
