import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BoardScene } from '@/components/BoardScene'
import { Logo, Text } from '@/components/ui'
import { colors, radius } from '@/theme'

/** Layout for sign-in, sign-up and account recovery: a board at dusk above the form. */
export function AuthFrame({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  const insets = useSafeAreaInsets()

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={[styles.hero, { paddingTop: insets.top }]}>
          <View style={styles.scene}>
            <BoardScene time="dusk" art="brand" headline="Your ad here" />
          </View>
          <View style={[styles.logo, { top: insets.top + 12 }]}>
            <Logo size={24} />
          </View>
        </View>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 32 }]}>
          <Text variant="display">{title}</Text>
          {subtitle ? <Text variant="muted">{subtitle}</Text> : null}
          <View style={styles.body}>{children}</View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  scroll: { flexGrow: 1 },
  hero: { overflow: 'hidden', backgroundColor: '#3d2c4d' },
  scene: { width: '100%', aspectRatio: 400 / 250 },
  logo: {
    position: 'absolute',
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.88)',
    boxShadow: '0 10px 30px rgba(30,31,34,0.12)',
  },
  sheet: {
    flexGrow: 1,
    marginTop: -24,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl + 6,
    borderTopRightRadius: radius.xl + 6,
    paddingHorizontal: 20,
    paddingTop: 28,
    gap: 6,
  },
  body: { marginTop: 22, gap: 18 },
})
