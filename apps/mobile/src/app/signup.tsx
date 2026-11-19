import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Link } from 'expo-router'
import { useRequest } from 'alova/client'
import { ArrowLeft } from 'lucide-react-native'
import type { AccountRoleKind } from '@greyboards/types'
import { ROLE_ICONS } from '@/components/AccountRoles'
import { AuthFrame } from '@/components/AuthFrame'
import { Button, Callout, CheckOption, Field, Input, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { openDocumentLink } from '@/lib/documents'
import { FormProblem } from '@/lib/forms'
import { useLimits } from '@/lib/limits'
import { useRoleDefinitions } from '@/lib/roles'
import { session } from '@/lib/session'
import { colors, fonts, radius } from '@/theme'

const STEPS = ['What brings you to Greyboards?', 'About you'] as const

export default function SignUp() {
  const [step, setStep] = useState(0)
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
  const hasRoles = definitions.length > 0
  const current = hasRoles ? step : 1

  const submit = async () => {
    const { data } = await register.send({ name: name.trim(), email: email.trim(), password, roles }).catch((error) => {
      if (FormProblem.from(error).fields.roles) setStep(0)

      throw error
    })

    await session.signIn(data)
  }

  const toggle = (kind: AccountRoleKind) => setRoles((picked) => (picked.includes(kind) ? picked.filter((role) => role !== kind) : [...picked, kind]))

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
        <Callout>Sign-ups are closed right now.</Callout>
      ) : (
        <>
          {hasRoles ? <SignUpSteps current={current} /> : null}
          {problem.summary ? <Callout>{problem.summary}</Callout> : null}

          {current === 0 ? (
            <>
              <Text variant="muted">You can change this later.</Text>
              {problem.fields.roles ? <Callout>{problem.fields.roles}</Callout> : null}
              <View style={styles.roles}>
                {definitions.map((definition) => (
                  <CheckOption
                    key={definition.kind}
                    icon={ROLE_ICONS[definition.kind]}
                    label={definition.label}
                    description={definition.description}
                    tag={definition.needsReview ? 'Quick review first' : undefined}
                    checked={roles.includes(definition.kind)}
                    onPress={() => toggle(definition.kind)}
                  />
                ))}
              </View>
              <Button title="Continue" size="lg" onPress={() => setStep(1)} />
            </>
          ) : (
            <>
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
              <View style={styles.actions}>
                {hasRoles ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => setStep(0)} style={({ pressed }) => [styles.back, pressed && styles.backPressed]}>
                    <ArrowLeft size={18} color={colors.ink900} />
                  </Pressable>
                ) : null}
                <Button
                  title={register.loading ? 'Creating your account…' : 'Create account'}
                  size="lg"
                  loading={register.loading}
                  onPress={() => submit().catch(() => undefined)}
                  style={styles.flex}
                />
              </View>
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
        </>
      )}
    </AuthFrame>
  )
}

/** Progress bar and title for the sign-up steps. */
function SignUpSteps({ current }: { current: number }) {
  return (
    <View style={styles.steps}>
      <View style={styles.bars} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {STEPS.map((label, index) => (
          <View key={label} style={[styles.bar, index <= current && styles.barDone]} />
        ))}
      </View>
      <Text style={styles.stepTitle} accessibilityRole="header">
        {STEPS[current]}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  agree: { textAlign: 'center' },
  roles: { gap: 10 },
  actions: { flexDirection: 'row', gap: 10 },
  back: {
    width: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surface100,
    backgroundColor: colors.white,
    boxShadow: '0 1px 2px rgba(30,31,34,0.08)',
  },
  backPressed: { backgroundColor: colors.surface100 },
  steps: { gap: 14 },
  bars: { flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 6, borderRadius: radius.full, backgroundColor: colors.surface200 },
  barDone: { backgroundColor: colors.brand500 },
  stepTitle: { fontFamily: fonts.displayHeavy, fontSize: 20, lineHeight: 26, letterSpacing: -0.4, color: colors.ink900 },
})
