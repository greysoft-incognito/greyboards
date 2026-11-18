import { useCallback, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Presentation } from 'lucide-react-native'
import type { OwnerProfile } from '@greyboards/types'
import { Section, SettingsPage } from '@/components/settings/SettingsPage'
import { Button, Callout, Field, Input, OtpInput, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { useUser } from '@/lib/session'
import { useAction } from '@/lib/use-action'
import { colors, fonts, radius } from '@/theme'

/** The board owners this account manages, adding more, and claiming a profile a scout made. */
export default function Owners() {
  const isOwner = useUser().accountRoles.some((role) => role.kind === 'owner' && role.status === 'active')
  const [profiles, setProfiles] = useState<OwnerProfile[] | null>(null)
  const [page, setPage] = useState({ current: 0, last: 1 })
  const [problem, setProblem] = useState<string | null>(null)
  const add = useAction()
  const more = useAction()
  const [name, setName] = useState('')

  const load = useCallback(async () => {
    try {
      const result = await api.account.ownerProfiles({ per_page: 50 }).send()

      setProfiles(result.data)
      setPage({ current: result.meta.current_page, last: result.meta.last_page })
    } catch (error) {
      setProblem(FormProblem.from(error).message)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const loadMore = () =>
    more.run(async () => {
      const result = await api.account.ownerProfiles({ per_page: 50, page: page.current + 1 }).send()

      setProfiles((shown) => [...(shown ?? []), ...result.data])
      setPage({ current: result.meta.current_page, last: result.meta.last_page })
    })

  const create = () =>
    add.run(async () => {
      await api.account.createOwnerProfile({ name: name.trim() }).send()
      setName('')
      await load()

      return 'Owner added.'
    })

  return (
    <SettingsPage title="Board owners" description="The owners whose boards you look after. An agency can manage several, and each board belongs to one.">
      <Section>
        {problem ? <Callout>{problem}</Callout> : null}
        {!profiles ? (
          problem ? null : <ActivityIndicator color={colors.brand600} />
        ) : profiles.length ? (
          profiles.map((profile) => <OwnerRow key={profile.id} profile={profile} onChange={load} />)
        ) : (
          <Text variant="muted">You don’t manage any owners yet. Tag your own board, or claim boards a scout listed under your number below.</Text>
        )}
        {page.current < page.last ? <Button title="Show more" variant="ghost" loading={more.busy} onPress={loadMore} /> : null}
        {isOwner ? (
          <View style={styles.add}>
            <Field label="Add an owner you manage" error={add.problem.fields.name ?? add.problem.summary ?? undefined} hint="Such as a client whose boards your agency runs.">
              <Input value={name} onChangeText={setName} maxLength={120} placeholder="Client Ltd" />
            </Field>
            <Button title="Add owner" variant="secondary" loading={add.busy} disabled={name.trim().length < 2} onPress={create} />
          </View>
        ) : null}
      </Section>

      <ClaimSection onClaimed={load} />
    </SettingsPage>
  )
}

function OwnerRow({ profile, onChange }: { profile: OwnerProfile; onChange: () => void }) {
  const action = useAction()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile.name)

  const rename = () =>
    action.run(async () => {
      await api.account.updateOwnerProfile(profile.id, { name: name.trim() }).send()
      setEditing(false)
      onChange()

      return 'Saved.'
    })

  return (
    <View style={styles.row}>
      <View style={styles.icon}>
        <Presentation size={20} color={colors.brand600} />
      </View>
      {editing ? (
        <View style={[styles.flex, styles.gap]}>
          <Input value={name} onChangeText={setName} maxLength={120} autoFocus accessibilityLabel="Owner name" />
          {action.problem.message ? <Callout>{action.problem.message}</Callout> : null}
          <View style={styles.buttons}>
            <Button title="Save" loading={action.busy} disabled={name.trim().length < 2} onPress={rename} />
            <Button title="Cancel" variant="ghost" onPress={() => setEditing(false)} />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}>
              {profile.name}
            </Text>
            <Text variant="small">
              {profile.phone ?? 'No phone number'}
              {profile.phoneVerifiedAt ? ' · confirmed' : ''}
            </Text>
          </View>
          <Button title="Rename" variant="ghost" onPress={() => setEditing(true)} />
        </>
      )}
    </View>
  )
}

/** Prove a phone number a scout listed boards under, by a texted code, to manage them. */
function ClaimSection({ onClaimed }: { onClaimed: () => void }) {
  const action = useAction()
  const [phone, setPhone] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState('')

  const send = () =>
    action.run(async () => {
      await api.account.claimOwnerProfile({ phone: phone.trim() }).send()
      setSentTo(phone.trim())

      return 'We’ve texted a code to that number.'
    })

  const verify = (entered = code) =>
    action.run(async () => {
      const { data } = await api.account.verifyOwnerClaim({ phone: sentTo!, code: entered }).send()

      setSentTo(null)
      setCode('')
      setPhone('')
      onClaimed()

      return `You now manage ${data.name}’s boards.`
    })

  return (
    <Section title="Claim your boards" description="If a scout listed your boards under your phone number, prove it’s yours and you’ll manage them here.">
      {sentTo ? (
        <>
          <Text variant="label">Code we texted to {sentTo}</Text>
          <OtpInput value={code} onChange={setCode} onComplete={verify} invalid={!!action.problem.message} disabled={action.busy} autoFocus />
          {action.problem.message ? <Callout>{action.problem.message}</Callout> : null}
          <Button title="Claim" loading={action.busy} disabled={code.length < 6} onPress={() => verify()} />
          <Button title="Use another number" variant="ghost" onPress={() => setSentTo(null)} />
        </>
      ) : (
        <>
          <Field label="Your phone number" error={action.problem.fields.phone}>
            <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={20} placeholder="+234 803 000 0000" autoComplete="tel" />
          </Field>
          {action.problem.summary ? <Callout>{action.problem.summary}</Callout> : null}
          <Button title="Text me a code" loading={action.busy} disabled={phone.trim().length < 7} onPress={send} />
        </>
      )}
    </Section>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 10 },
  add: { gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.surface100 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand50 },
  name: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink900 },
  buttons: { flexDirection: 'row', gap: 8 },
})
