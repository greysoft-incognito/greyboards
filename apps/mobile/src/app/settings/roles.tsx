import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useRequest } from 'alova/client'
import type { AccountRole, AccountRoleDefinition, AccountRoleKind, IdentityDocumentDefinition, PartnerChecks } from '@greyboards/types'
import { RoleIcon, RoleStatus, heldRole, missingWords, stillNeeded } from '@/components/AccountRoles'
import { Standing } from '@/components/reputation/Badges'
import { RoleReputationPanel } from '@/components/reputation/RoleReputation'
import { ApplicationChecklist } from '@/components/settings/ApplicationChecklist'
import { PartnerChecksSection } from '@/components/settings/PartnerChecks'
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
  const [checks, setChecks] = useState<{ data: PartnerChecks; documents: IdentityDocumentDefinition[] } | null>(null)
  const reviewed = (role: AccountRole) => definitions.some((definition) => definition.kind === role.kind && definition.needsReview)
  const applying = held.some(reviewed)
  const waiting = held.some((role) => role.status === 'pending' && reviewed(role))

  useEffect(() => {
    if (!applying) return setChecks(null)

    api.account
      .partnerChecks()
      .send()
      .then(({ data, documents }) => setChecks({ data, documents }))
      .catch(() => setChecks(null))
  }, [applying])

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
      description="Advertisers and board owners can start right away. Scouts and dispatchers get a quick review first."
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
                {role ? <RoleStatus status={role.status} missing={stillNeeded(role)} /> : null}
                {role ? <Standing standing={role.reputation} showScore={false} /> : null}
              </View>
            </View>
            <Text variant="muted">{definition.description}</Text>
            {role?.note ? <Text style={styles.note}>Reviewer's note: {role.note}</Text> : null}
            {role?.status === 'pending' && stillNeeded(role).length ? <Text style={styles.waiting}>Add {missingWords(stillNeeded(role))} below so we can approve this.</Text> : null}
            {role && (role.status === 'active' || role.status === 'suspended') ? <RoleReputationPanel kind={role.kind} reputation={role.reputation} /> : null}
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

      {checks && waiting ? <ApplicationChecklist checks={checks.data} /> : null}
      {checks ? <PartnerChecksSection checks={checks.data} documents={checks.documents} onChange={(data) => setChecks((current) => current && { ...current, data })} /> : null}
    </SettingsPage>
  )
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  flex: { flex: 1, gap: 6 },
  note: { fontSize: 14, lineHeight: 20, color: colors.ink700 },
  waiting: { fontSize: 14, lineHeight: 20, color: colors.held },
})
