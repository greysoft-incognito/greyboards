import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Link } from 'expo-router'
import { useRequest } from 'alova/client'
import type { AccountRoleKind } from '@greyboards/types'
import { AuthFrame } from '@/components/AuthFrame'
import { Button, Callout, CheckOption, Field, Input, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { openDocumentLink } from '@/lib/documents'
import { FormProblem } from '@/lib/forms'
import { useLimits } from '@/lib/limits'
import { useRoleDefinitions } from '@/lib/roles'
import { session } from '@/lib/session'

export default function SignUp() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [roles, setRoles] = useState<AccountRoleKind[]>(['advertiser'])
  const definitions = useRoleDefinitions()
  const register = useRequest((form: { name: string; email: string; password: string; roles: AccountRoleKind[] }) => api.auth.register(form), {
    immediate: false,
  })
  const problem = FormProblem.from(register.error)
  const { registrationOpen } = useLimits()

  const submit = async () => {
    const { data } = await register.send({ name: name.trim(), email: email.trim(), password, roles })

    await session.signIn(data)
  }

  const toggle = (kind: AccountRoleKind) => setRoles((current) => (current.includes(kind) ? current.filter((role) => role !== kind) : [...current, kind]))

  return (
    <AuthFrame
      title="Join Greyboards"
      subtitle={
        <>
          Already have an account?{' '}
          <Link href="/signin" replace>
            <Text variant="link">Sign in</Text>
          </Link>
        </>
      }
    >
      {!registrationOpen ? (
        <Callout>Sign-ups are closed right now. If you already have an account, sign in instead.</Callout>
      ) : (
        <>
          {problem.summary ? <Callout>{problem.summary}</Callout> : null}
          <Field label="Your name" error={problem.fields.name}>
            <Input value={name} onChangeText={setName} invalid={!!problem.fields.name} autoComplete="name" textContentType="name" autoFocus />
          </Field>
          <Field label="Email" error={problem.fields.email}>
            <Input
              value={email}
              onChangeText={setEmail}
              invalid={!!problem.fields.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
          </Field>
          <Field label="Password" error={problem.fields.password} hint="At least 8 characters.">
            <Input
              value={password}
              onChangeText={setPassword}
              invalid={!!problem.fields.password}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={() => submit().catch(() => undefined)}
            />
          </Field>
          {definitions.length ? (
            <Field label="How will you use Greyboards?" error={problem.fields.roles} hint="Pick any. Scouts and billposters are checked before they start.">
              <View style={styles.roles}>
                {definitions.map((definition) => (
                  <CheckOption
                    key={definition.kind}
                    label={definition.label}
                    description={definition.description}
                    checked={roles.includes(definition.kind)}
                    onPress={() => toggle(definition.kind)}
                  />
                ))}
              </View>
            </Field>
          ) : null}
          <Button
            title={register.loading ? 'Creating your account…' : 'Create account'}
            size="lg"
            loading={register.loading}
            onPress={() => submit().catch(() => undefined)}
          />
          <Text variant="muted" style={styles.agree}>
            By creating an account you agree to the{' '}
            <Text variant="link" onPress={() => openDocumentLink('/terms')}>
              terms of use
            </Text>{' '}
            and{' '}
            <Text variant="link" onPress={() => openDocumentLink('/privacy')}>
              privacy policy
            </Text>
            .
          </Text>
        </>
      )}
    </AuthFrame>
  )
}

const styles = StyleSheet.create({
  agree: { textAlign: 'center' },
  roles: { gap: 10 },
})
