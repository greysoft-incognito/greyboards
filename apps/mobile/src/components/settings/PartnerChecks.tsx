import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import type { ImagePickerAsset } from 'expo-image-picker'
import { BadgeCheck, CircleAlert, IdCard, Landmark } from 'lucide-react-native'
import type { IdentityDocument, IdentityDocumentDefinition, PartnerChecks } from '@greyboards/types'
import { Button, Callout, Field, Input, Select, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { PlainProblem } from '@/lib/forms'
import { useLimits } from '@/lib/limits'
import { pickImage } from '@/lib/pick-image'
import { uploadFile } from '@/lib/upload-file'
import { useAction } from '@/lib/use-action'
import { colors, fonts, radius } from '@/theme'
import { Section } from './SettingsPage'

const ID_STATUS: Record<NonNullable<PartnerChecks['identity']>['status'], string> = {
  submitted: 'Being reviewed',
  verified: 'Checked',
  rejected: 'Not approved',
}

/**
 * What scouts and dispatchers send before a reviewer lets them in: a photo of a
 * government ID, and a bank account whose name matches it.
 */
export function PartnerChecksSection({ checks, documents, onChange }: { checks: PartnerChecks; documents: IdentityDocumentDefinition[]; onChange: (checks: PartnerChecks) => void }) {
  const { maxImageMb } = useLimits()
  const pick = useAction()
  const send = useAction()
  const identity = checks.identity
  const [documentType, setDocumentType] = useState<IdentityDocument>(identity?.documentType ?? documents[0]?.type ?? 'nin')
  const [documentNumber, setDocumentNumber] = useState('')
  const [fullName, setFullName] = useState(identity?.fullName ?? '')
  const [photo, setPhoto] = useState<ImagePickerAsset | null>(null)
  const [replacing, setReplacing] = useState(false)
  const canSend = !identity || identity.status === 'rejected' || replacing

  useEffect(() => setReplacing(false), [identity?.createdAt])

  const choose = (source: 'camera' | 'library') =>
    pick.run(async () => {
      const asset = await pickImage({ source, maxMb: maxImageMb, why: 'add a photo of your ID' })

      if (asset) setPhoto(asset)
    })

  const submit = () =>
    send.run(async () => {
      if (!photo) throw new PlainProblem('Add a photo of your ID.')

      const { data, message } = await api.account.sendIdentity({ documentType, documentNumber: documentNumber.trim(), fullName: fullName.trim() }, uploadFile(photo)).send()

      setPhoto(null)
      setDocumentNumber('')
      onChange(data)

      return message
    })

  return (
    <Section title="Verify your identity" description="Scouts and dispatchers work with other people's boards, so we need to know who you are and where to pay you.">
      <View style={styles.row}>
        <IdCard size={20} color={colors.brand600} />
        <View style={styles.flex}>
          <Text style={styles.label}>Your ID</Text>
          {identity ? (
            <Text style={styles.value}>
              {identity.documentLabel}, {identity.fullName}, {identity.documentNumber} · {ID_STATUS[identity.status]}
            </Text>
          ) : (
            <Text variant="muted">Not sent yet.</Text>
          )}
          {identity?.status === 'rejected' && identity.note ? <Text style={styles.problem}>Reviewer's note: {identity.note}</Text> : null}
        </View>
        {identity?.status === 'verified' ? <BadgeCheck size={20} color={colors.available} accessibilityLabel="Checked" /> : null}
      </View>
      {identity?.status === 'submitted' && !replacing ? <Button title="Send a different photo" variant="ghost" onPress={() => setReplacing(true)} /> : null}

      {canSend ? (
        <View style={styles.form}>
          <Field label="ID type" error={send.problem.fields.documentType}>
            <Select label="ID type" value={documentType} onChange={setDocumentType} options={documents.map((document) => ({ value: document.type, label: document.label }))} />
          </Field>
          <Field label="ID number" error={send.problem.fields.documentNumber}>
            <Input value={documentNumber} onChangeText={setDocumentNumber} invalid={!!send.problem.fields.documentNumber} maxLength={30} autoCapitalize="characters" autoCorrect={false} />
          </Field>
          <Field label="Name on your ID" error={send.problem.fields.fullName}>
            <Input value={fullName} onChangeText={setFullName} invalid={!!send.problem.fields.fullName} maxLength={120} autoCapitalize="words" textContentType="name" />
          </Field>
          <Field label="Photo of the ID" error={send.problem.fields.photo ?? pick.problem.message} hint={`Make sure all four corners are visible. Up to ${maxImageMb} MB.`}>
            {photo ? <Image source={{ uri: photo.uri }} style={styles.preview} contentFit="cover" accessibilityLabel="Your ID photo" /> : null}
            <View style={styles.pickers}>
              <Button title={photo ? 'Retake' : 'Take a photo'} variant="secondary" disabled={pick.busy || send.busy} onPress={() => choose('camera')} style={styles.flex} />
              <Button title="Choose a photo" variant="ghost" disabled={pick.busy || send.busy} onPress={() => choose('library')} style={styles.flex} />
            </View>
          </Field>
          {send.problem.summary ? <Callout>{send.problem.summary}</Callout> : null}
          <Button title={identity ? 'Send the new photo' : 'Send'} variant={identity ? 'secondary' : 'primary'} loading={send.busy} onPress={submit} />
          {replacing ? <Button title="Cancel" variant="ghost" disabled={send.busy} onPress={() => setReplacing(false)} /> : null}
        </View>
      ) : null}

      <View style={[styles.row, styles.divided]}>
        <Landmark size={20} color={colors.brand600} />
        <View style={styles.flex}>
          <Text style={styles.label}>Your bank account</Text>
          {checks.bank ? (
            <Text style={styles.value}>
              {checks.bank.accountName}, {checks.bank.bankName} {checks.bank.maskedNumber}
            </Text>
          ) : (
            <Text variant="muted">
              Not added yet.{' '}
              <Text variant="link" onPress={() => router.push('/settings/payouts')}>
                Add it under Payouts
              </Text>
            </Text>
          )}
          {checks.namesMatch === false ? (
            <View style={styles.warning}>
              <CircleAlert size={16} color={colors.held} />
              <Text style={[styles.flex, styles.warningText]}>The name on this bank account doesn't match your ID. We may ask you about it.</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Section>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  divided: { paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.surface200 },
  label: { fontFamily: fonts.semibold, color: colors.ink900 },
  value: { fontSize: 14, lineHeight: 20, color: colors.ink700 },
  problem: { marginTop: 4, fontSize: 14, lineHeight: 20, color: colors.red700 },
  form: { gap: 14, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface100 },
  pickers: { flexDirection: 'row', gap: 10 },
  preview: { width: '100%', aspectRatio: 1.6, borderRadius: radius.lg, backgroundColor: colors.surface200 },
  warning: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6 },
  warningText: { fontSize: 14, lineHeight: 20, color: colors.held },
})
