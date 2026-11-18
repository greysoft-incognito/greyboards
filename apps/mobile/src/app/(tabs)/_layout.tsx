import type { ColorValue } from 'react-native'
import { Tabs } from 'expo-router'
import { CalendarCheck, CircleUserRound, LayoutDashboard, type LucideIcon, MapPinned, Presentation, Printer } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppHeader } from '@/components/AppHeader'
import { taggingRoles } from '@/components/boards/BoardBits'
import { GlassBackground, GlassScene, GlassTabBar, GlassTabs, glassTabBarStyle } from '@/components/GlassTabBar'
import { useUser } from '@/lib/session'
import { colors, fonts } from '@/theme'

const icon =
  (Icon: LucideIcon) =>
  ({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) => <Icon color={color as string} size={size} strokeWidth={focused ? 2.4 : 2} />

/** The signed-in app: the dashboard, finding boards, bookings, boards for owners and scouts, and the account, under the shared header and over the glass tab bar. */
export default function TabsLayout() {
  const insets = useSafeAreaInsets()
  const roles = useUser().accountRoles
  const tags = taggingRoles(roles).length > 0
  const posts = roles.some((role) => role.kind === 'dispatch')

  return (
    <GlassTabs>
      <Tabs
        tabBar={(props) => <GlassTabBar {...props} />}
        screenLayout={({ route, children }) => <GlassScene routeKey={route.key}>{children}</GlassScene>}
        screenOptions={{
          header: () => <AppHeader />,
          tabBarActiveTintColor: colors.brand500,
          tabBarInactiveTintColor: colors.ink500,
          tabBarStyle: { ...glassTabBarStyle, height: 64 + insets.bottom, paddingTop: 4, paddingBottom: insets.bottom + 4 },
          tabBarBackground: () => <GlassBackground />,
          tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14 },
          sceneStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: icon(LayoutDashboard) }} />
        <Tabs.Screen name="find" options={{ title: 'Find', tabBarIcon: icon(MapPinned) }} />
        <Tabs.Screen name="bookings" options={{ title: 'Bookings', tabBarIcon: icon(CalendarCheck) }} />
        <Tabs.Screen name="boards" options={{ title: 'Boards', tabBarIcon: icon(Presentation), href: tags ? undefined : null }} />
        <Tabs.Screen name="jobs" options={{ title: 'Jobs', tabBarIcon: icon(Printer), href: posts ? undefined : null }} />
        <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: icon(CircleUserRound) }} />
      </Tabs>
    </GlassTabs>
  )
}
