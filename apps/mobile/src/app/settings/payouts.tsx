import { useCallback, useState } from 'react'
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { BadgeCheck, Landmark } from 'lucide-react-native'
import type { Bank, Payout, PayoutAccount, PayoutSummary } from '@greyboards/types'
import { Section, SettingsPage } from '@/components/settings/SettingsPage'
import { Button, Callout, Field, Input, Select, Text } from '@/components/ui'
import { api } from '@/lib/api'
import { FormProblem } from '@/lib/forms'
import { formatDay, formatMoney } from '@/lib/format'
import { useAction } from '@/lib/use-action'
import { colors, fonts, radius, surfaces } from '@/theme'

const STATUS: Record<Payout['status'], string> = { processing: 'On its way', paid: 'Paid', failed: 'Failed, we’ll try again' }

/** Where the account, and each owner it looks after, is paid, with what's owed and what was sent. */
export default function Payouts() {
  const [summary, setSummary] = useState<PayoutSummary | null>(null)
  const [banks, setBanks] = useState<Bank[]>([])
  const [history, setHistory] = useState<Payout[]>([])
  const [page, setPage] = useState({ current: 0, last: 1 })
  const [problem, setProblem] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const more = useAction()

  const load = useCallback(async () => {
    try {
      const [own, bankList, sent] = await Promise.all([api.account.payouts().send(), api.banks().send(), api.account.payoutHistory({ per_page: 20 }).send()])

      setSummary(own.data)
      setBanks(bankList.data)
      setHistory(sent.data)
      setPage({ current: sent.meta.current_page, last: sent.meta.last_page })
      setProblem(null)
    } catch (error) {
      setProblem(FormProblem.from(error).message)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const refresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const loadMore = () =>
    more.run(async () => {
      const result = await api.account.payoutHistory({ per_page: 20, page: page.current + 1 }).send()

      setHistory((shown) => [...shown, ...result.data])
      setPage({ current: result.meta.current_page, last: result.meta.last_page })
    })

  return (
    <SettingsPage
      title="Payouts"
      description="Where we send what you earn from bookings, scouting and printing. We check every account with the bank first."
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      {problem ? <Callout>{problem}</Callout> : null}
      {!summary ? (
        problem ? null : <ActivityIndicator color={colors.brand600} />
      ) : (
        <>
          <View style={styles.totals}>
            <Total label="Owed to you" amount={summary.owedMinor} hint="Released from bookings, not sent yet" />
            <Total label="Paid out" amount={summary.paidMinor} hint="Sent to your bank accounts" />
          </View>
          {!summary.enabled ? <Callout tone="warning">Payouts start soon. Add your bank details now and what you’re owed goes out once they do.</Callout> : null}

          <Section title="Your bank account" description="For your scout’s cut and print jobs.">
            <AccountForm account={summary.account} banks={banks} onSaved={load} />
          </Section>

          {summary.owners.map((owner) => (
            <Section key={owner.profileId} title={owner.name} description="Where this owner’s share of each booking goes.">
              <AccountForm profileId={owner.profileId} account={owner.account} banks={banks} onSaved={load} />
            </Section>
          ))}

          <Section title="Sent">
            {history.length ? (
              history.map((payout) => <PayoutRow key={payout.id} payout={payout} />)
            ) : (
              <Text variant="muted">Nothing sent yet. Money is released once an advertiser accepts the photos of their ad, then sent a couple of days later.</Text>
            )}
            {page.current < page.last ? <Button title="Show more" variant="ghost" loading={more.busy} onPress={loadMore} /> : null}
          </Section>
        </>
      )}
    </SettingsPage>
  )
}

function Total({ label, amount, hint }: { label: string; amount: number; hint: string }) {
  return (
    <View style={styles.total}>
      <Text variant="small">{label}</Text>
      <Text style={styles.amount}>{formatMoney(amount)}</Text>
      <Text variant="small">{hint}</Text>
    </View>
  )
}

/** The bank account on file, checked with the bank, and the form to set or change it. */
function AccountForm({ profileId, account, banks, onSaved }: { profileId?: string; account: PayoutAccount | null; banks: Bank[]; onSaved: () => void }) {
  const action = useAction()
  const [bankCode, setBankCode] = useState(account?.bankCode ?? '')
  const [accountNumber, setAccountNumber] = useState('')
  const errors = action.problem.fields

  const save = () =>
    action.run(async () => {
      const details = { bankCode, accountNumber: accountNumber.replace(/\s/g, '') }
      const { data } = profileId ? await api.account.saveOwnerPayoutAccount(profileId, details).send() : await api.account.savePayoutAccount(details).send()

      setAccountNumber('')
      onSaved()

      return `Payouts go to ${data.accountName}.`
    })

  return (
    <>
      {account ? (
        <View style={styles.account}>
          <Landmark size={20} color={colors.brand600} />
          <View style={styles.flex}>
            <Text style={styles.strong}>{account.accountName}</Text>
            <Text variant="small">
              {account.bankName} · {account.accountNumber}
            </Text>
          </View>
          <BadgeCheck size={20} color={colors.available} accessibilityLabel="Checked with the bank" />
        </View>
      ) : null}
      <Field label="Bank" error={errors.bankCode}>
        <Select label="Bank" value={bankCode} onChange={setBankCode} options={[...(bankCode ? [] : [{ value: '', label: 'Pick your bank' }]), ...banks.map((bank) => ({ value: bank.code, label: bank.name }))]} />
      </Field>
      <Field label="Account number" error={errors.accountNumber}>
        <Input value={accountNumber} onChangeText={setAccountNumber} keyboardType="number-pad" maxLength={13} placeholder="0123456789" autoComplete="off" />
      </Field>
      {action.problem.summary ? <Callout>{action.problem.summary}</Callout> : null}
      <Button title={account ? 'Change' : 'Save'} loading={action.busy} disabled={!bankCode || accountNumber.replace(/\s/g, '').length < 10} onPress={save} />
    </>
  )
}

function PayoutRow({ payout }: { payout: Payout }) {
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text style={styles.strong}>{STATUS[payout.status]}</Text>
        <Text variant="small">
          {payout.bankName} {payout.accountNumber} · {formatDay((payout.paidAt ?? payout.createdAt).slice(0, 10))}
        </Text>
        {payout.failureReason ? <Text style={styles.failure}>{payout.failureReason}</Text> : null}
      </View>
      <Text style={styles.strong}>{formatMoney(payout.amountMinor, payout.currency)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  totals: { flexDirection: 'row', gap: 12 },
  total: { flex: 1, gap: 2, padding: 16, ...surfaces.panel },
  amount: { fontFamily: fonts.displayHeavy, fontSize: 22, color: colors.ink900 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface100 },
  strong: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink900 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.surface100 },
  failure: { fontSize: 12, color: colors.red700 },
})
