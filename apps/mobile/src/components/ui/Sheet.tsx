import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, radius, surfaces } from '@/theme'
import { Text } from './Text'

/** A bottom sheet with a title over the screen, for short notes and small forms. */
export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <KeyboardAvoidingView behavior="padding" enabled={Platform.OS === 'ios'} style={styles.frame}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <Text variant="title" style={styles.title}>
            {title}
          </Text>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: surfaces.backdrop },
  frame: { maxHeight: '85%' },
  sheet: { flexShrink: 1, backgroundColor: colors.white, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: 8 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.surface300, marginBottom: 12 },
  title: { paddingHorizontal: 20, marginBottom: 8 },
  scroll: { flexGrow: 0, flexShrink: 1, flexBasis: 'auto' },
  body: { paddingHorizontal: 20, paddingBottom: 4, gap: 14 },
})
