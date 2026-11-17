import { useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useRequest } from 'alova/client'
import type { AccountRole, AccountRoleDefinition, AccountRoleKind } from '@greyboards/types'
import { RoleIcon, RoleStatus, heldRole } from '@/components/AccountRoles'
import { SettingsPage, Section } from '@/components/settings/SettingsPage'
import { Button, Callout, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { session } from '@/lib/session'
import { useAction } from '@/lib/use-action'
import { colors } from '@/theme'

/** The marketplace roles the account holds, and taking on or giving up one. */
export default function Roles() {
  const roles = useRequest(() => api.account.roles())
  const action = useAction()
  const [acting, setActing] = useState<AccountRoleKind | null>(null)
  const held: AccountRole[] = roles.data?.data ?? []
  const definitions: AccountRoleDefinition[] = roles.data?.definitions ?? []

  const change = (kind: AccountRoleKind, intent: 'take' | 'drop') => {
    setActing(kind)

    return action.run(async () => {
      const { message } = intent === 'take' ? await api.account.takeRole(kind).send() : await api.account.dropRole(kind).send()

      await roles.send()
      await session.setUser((await api.auth.me().send()).data)

      return message
    }).finally(() => setActing(null))
  }

  return (
    <SettingsPage
      title="How you use Greyboards"
      description="One account can do several things. Advertisers and board owners can start at once; scouts and dispatchers are checked first."
    >
      {roles.error ? <Callout>{FormProblem.from(roles.error).message}</Callout> : null}
      {action.problem.message ? <Callout>{action.problem.message}</Callout> : null}
      {roles.loading && !definitions.length ? <ActivityIndicator color={colors.ink500} /> : null}

      {definitions.map((definition) => {
        const role = heldRole(held, definition.kind)
        const busy = action.busy && acting === definition.kind

        return (
          <Section key={definition.kind}>
            <View style={styles.top}>
              <RoleIcon kind={definition.kind} size={48} />
              <View style={styles.flex}>
                <Text variant="title">{definition.label}</Text>
                {role ? <RoleStatus status={role.status} /> : null}
              </View>
            </View>
            <Text variant="muted">{definition.description}</Text>
            {role?.note ? <Text style={styles.note}>Reviewer's note: {role.note}</Text> : null}
            {!role || role.status === 'rejected' ? (
              <Button
                title={role ? 'Apply again' : definition.needsReview ? 'Apply' : 'Start'}
                variant={role ? 'secondary' : 'primary'}
                loading={busy}
                disabled={action.busy}
                onPress={() => change(definition.kind, 'take')}
              />
            ) : role.status !== 'suspended' ? (
              <Button
                title={role.status === 'pending' ? 'Withdraw' : 'Stop'}
                variant="ghost"
                loading={busy}
                disabled={action.busy}
                onPress={() => change(definition.kind, 'drop')}
              />
            ) : null}
          </Section>
        )
      })}
    </SettingsPage>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  flex: { flex: 1, gap: 6 },
  note: { fontSize: 14, lineHeight: 20, color: colors.ink700 },
})
