import type { ReactElement, ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, type RefreshControlProps, ScrollView, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from '@/components/ui'
import { colors, fonts, surfaces } from '@/theme'

/** A settings screen: a way back, its title and what it's for, then its sections. */
export function SettingsPage({ title, description, refreshControl, children }: { title: string; description?: string; refreshControl?: ReactElement<RefreshControlProps>; children: ReactNode }) {
  const insets = useSafeAreaInsets()

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled" refreshControl={refreshControl}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/account'))} hitSlop={8} style={styles.back}>
          <ChevronLeft size={24} color={colors.ink900} />
        </Pressable>
        <Text variant="display">{title}</Text>
        {description ? <Text variant="muted">{description}</Text> : null}
        <View style={styles.sections}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

/** A card of related settings. */
export function Section({ title, description, danger, children }: { title?: string; description?: string; danger?: boolean; children: ReactNode }) {
  return (
    <View style={[styles.section, danger && styles.danger]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {description ? <Text variant="muted">{description}</Text> : null}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  page: { paddingHorizontal: 20, gap: 8 },
  back: { alignSelf: 'flex-start', marginLeft: -6, paddingVertical: 4 },
  sections: { gap: 16, marginTop: 16 },
  section: { gap: 14, padding: 18, ...surfaces.panel },
  danger: { borderColor: colors.red200 },
  title: { fontSize: 18, lineHeight: 24, fontFamily: fonts.display, color: colors.ink900 },
})
