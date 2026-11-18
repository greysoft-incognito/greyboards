import { Stack } from 'expo-router'
import { colors } from '@/theme'

export default function SharesLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />
}
