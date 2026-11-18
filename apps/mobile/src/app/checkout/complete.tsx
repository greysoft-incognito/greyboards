import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Text } from '@/components/ui'
import { api } from '@/lib/api'
import { OUTCOME_MESSAGES } from '@/lib/checkout'
import { toast } from '@/lib/toast'
import { colors } from '@/theme'

/** Where the payment provider's link lands when it opens the app: checks the payment, then shows the booking. */
export default function CheckoutComplete() {
  const { reference } = useLocalSearchParams<{ reference?: string }>()

  useEffect(() => {
    if (!reference) {
      router.replace('/bookings')

      return
    }

    api
      .verifyPayment(reference)
      .send()
      .then(({ data }) => {
        const outcome = data.status === 'complete' ? 'paid' : data.status === 'rejected' ? 'failed' : 'pending'

        toast.show(OUTCOME_MESSAGES[outcome], outcome === 'failed' ? 'error' : 'success')
        router.replace({ pathname: '/bookings/[id]', params: { id: data.bookingId } })
      })
      .catch(() => {
        toast.show(OUTCOME_MESSAGES.pending)
        router.replace('/bookings')
      })
  }, [reference])

  return (
    <View style={styles.screen}>
      <ActivityIndicator color={colors.brand600} />
      <Text variant="muted">Checking your payment…</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.canvas },
})
