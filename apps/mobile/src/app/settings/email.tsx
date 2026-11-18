import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { SettingsPage, Section } from '@/components/settings/SettingsPage'
import { Button, Callout, Field, Input, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { session, useUser } from '@/lib/session'
import { useAction } from '@/lib/use-action'
import { colors, fonts } from '@/theme'

export default function Email() {
  const user = useUser()
  const verify = useAction()
  const change = useAction()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const resend = () =>
    verify.run(async () => {
      await api.account.sendVerification().send()

      return 'Check your inbox for the link.'
    })

  const save = () =>
    change.run(async () => {
      const { data } = await api.account.updateEmail({ email: email.trim(), password }).send()

      await session.setUser(data)
      setEmail('')
      setPassword('')

      return `Email updated. Check ${data.email} for a link to confirm it.`
    })

  return (
    <SettingsPage title="Email" description="You use this email to sign in.">
      <Section>
        <View style={styles.status}>
          <Text style={styles.address} numberOfLines={1}>
            {user.email}
          </Text>
          {user.emailVerified ? (
            <Text style={styles.good}>Confirmed</Text>
          ) : (
            <Text style={styles.warn}>Not confirmed yet. Check your inbox.</Text>
          )}
        </View>
        {!user.emailVerified ? <Button title={verify.busy ? 'Sending…' : 'Resend link'} variant="secondary" loading={verify.busy} onPress={resend} /> : null}
        {verify.problem.message ? <Callout>{verify.problem.message}</Callout> : null}
      </Section>

      <Section title="Change email" description="We’ll send a link to your new address to confirm it.">
        <Field label="New email" error={change.problem.fields.email}>
          <Input value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
        </Field>
        <Field label="Your password" error={change.problem.fields.password}>
          <Input value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" />
        </Field>
        {change.problem.summary ? <Callout>{change.problem.summary}</Callout> : null}
        <Button title={change.busy ? 'Changing…' : 'Change email'} loading={change.busy} disabled={!email.trim() || !password} onPress={save} />
      </Section>
    </SettingsPage>
  )
}

const styles = StyleSheet.create({
  status: { gap: 4 },
  address: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink900 },
  good: { fontSize: 14, color: colors.emerald700 },
  warn: { fontSize: 14, color: colors.amber700 },
})
