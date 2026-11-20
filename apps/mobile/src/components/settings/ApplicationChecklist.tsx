import { Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { ArrowRight, Circle, CircleCheck } from 'lucide-react-native'
import type { PartnerChecks, PartnerRequirement } from '@greyboards/types'
import { Text } from '@/components/ui'
import { colors, fonts, radius } from '@/theme'
import { Section } from './SettingsPage'

interface Step {
  label: string
  done: boolean
  hint?: string
  link?: { to: '/settings/payouts'; label: string }
}

/** Each thing a scout or dispatcher sends, worded for where they are with it. */
function step(requirement: PartnerRequirement, checks: PartnerChecks): Step {
  const done = !(checks.missing ?? []).includes(requirement)

  if (requirement === 'bank') {
    return done ? { label: 'Bank account added', done } : { label: "Add the bank account we'll pay you into", done, link: { to: '/settings/payouts', label: 'Add it' } }
  }

  if (done) return { label: checks.identity?.status === 'verified' ? 'ID checked' : 'ID sent', done }

  return { label: checks.identity ? 'Send a clearer photo of your ID' : 'Send a photo of your ID', done, hint: 'Just below' }
}

/** What a waiting application still needs before we can approve it. */
export function ApplicationChecklist({ checks }: { checks: PartnerChecks }) {
  if (!checks.required?.length) return null

  const ready = !checks.missing?.length

  return (
    <Section title={ready ? "You're all set" : 'Finish your application'} description={ready ? "We'll review your application and email you." : 'We can only approve you once these are in.'}>
      {checks.required.map((requirement) => {
        const item = step(requirement, checks)
        const Icon = item.done ? CircleCheck : Circle

        return (
          <View key={requirement} style={styles.row} accessibilityLabel={`${item.label}, ${item.done ? 'done' : 'to do'}`}>
            <Icon size={20} color={item.done ? colors.available : colors.ink500} />
            <Text style={[styles.label, item.done && styles.done]}>{item.label}</Text>
            {item.hint ? <Text variant="small">{item.hint}</Text> : null}
            {item.link ? <FinishLink label={item.link.label} to={item.link.to} /> : null}
          </View>
        )
      })}
    </Section>
  )
}

/** Takes the account to what its application still needs. */
export function FinishLink({ label = 'Finish your application', to = '/settings/roles' }: { label?: string; to?: '/settings/roles' | '/settings/payouts' }) {
  return (
    <Pressable accessibilityRole="link" onPress={() => router.push(to)} hitSlop={8} style={styles.link}>
      <Text variant="link">{label}</Text>
      <ArrowRight size={16} color={colors.brand700} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.lg, backgroundColor: colors.surface100 },
  label: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: fonts.semibold, color: colors.ink900 },
  done: { fontFamily: fonts.body, color: colors.ink500 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
})
