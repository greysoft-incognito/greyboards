import { useState } from 'react'
import { Link } from 'expo-router'
import { useRequest } from 'alova/client'
import { AuthFrame } from '@/components/AuthFrame'
import { Button, Callout, Field, Input, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const request = useRequest((form: { email: string }) => api.auth.forgotPassword(form), { immediate: false })
  const problem = FormProblem.from(request.error)
  const sent = request.data && !request.error ? request.data : null

  return (
    <AuthFrame
      title="Forgot your password?"
      subtitle={
        <>
          Remembered it?{' '}
          <Link href="/signin" replace>
            <Text variant="link">Sign in</Text>
          </Link>
        </>
      }
    >
      {sent ? (
        <>
          <Callout tone="notice">{sent.message}</Callout>
          <Text variant="muted">
            It expires in an hour. Can't find it? Check your spam folder.
          </Text>
        </>
      ) : (
        <>
          {problem.summary ? <Callout>{problem.summary}</Callout> : null}
          <Text variant="muted">We'll email you a link to reset it.</Text>
          <Field label="Email" error={problem.fields.email}>
            <Input
              value={email}
              onChangeText={setEmail}
              invalid={!!problem.fields.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              autoFocus
            />
          </Field>
          <Button
            title={request.loading ? 'Sending…' : 'Send reset link'}
            size="lg"
            loading={request.loading}
            onPress={() => request.send({ email: email.trim() }).catch(() => undefined)}
          />
        </>
      )}
    </AuthFrame>
  )
}
