import { OwnerProfile } from '@app/models/OwnerProfile'
import { Payout } from '@app/models/Payout'
import { PayoutAccount, type PayoutHolder } from '@app/models/PayoutAccount'
import { PayoutAccountResource } from '@app/http/resources/PayoutAccountResource'
import { PayoutCollection } from '@app/http/resources/PayoutCollection'
import { Gateways } from '@app/services/payments/Gateways'
import { PaymentRegions } from '@app/services/payments/PaymentRegions'
import { Settings } from '@app/support/Settings'
import { BaseController } from './BaseController'
import { GenericResource } from 'resora'
import { DB } from 'arkormx'
import { RequestException, perPage } from '@arkstack/common'

const ACCOUNT_RULES = {
  bankCode: 'required|string|max:20',
  accountNumber: 'required|digits:10',
}

/** Where money owed is paid, what's owed, and what was sent. */
export default class PayoutController extends BaseController {
  async banks() {
    const banks = await (await Gateways.payouts()).banks(String(await Settings.get('payouts.country')))

    return new GenericResource(banks).additional({ status: 'success', message: 'OK', code: 200 })
  }

  /** The account's own bank details, and those of each owner it takes payouts for. */
  async show() {
    const profiles = await this.payoutProfiles()
    const own = await PayoutAccount.find({ userId: this.user.id })
    const owners = await Promise.all(
      profiles.map(async (profile) => {
        const account = await PayoutAccount.find({ ownerProfileId: profile.id })

        return { profileId: profile.id, name: profile.name, account: account ? await new PayoutAccountResource(account).data() : null }
      }),
    )

    return new GenericResource({
      enabled: Boolean(await Settings.get('payouts.enabled')),
      account: own ? await new PayoutAccountResource(own).data() : null,
      owners,
      ...(await this.totals(profiles.map((profile) => profile.id))),
    }).additional({ status: 'success', message: 'OK', code: 200 })
  }

  async save() {
    return this.saveFor({ userId: this.user.id })
  }

  async saveForOwner() {
    const profile = await OwnerProfile.query().find(String(this.params.profile))

    if (!profile || !profile.takesPayoutsFor(this.user)) throw new RequestException('Owner not found.', 404)

    return this.saveFor({ ownerProfileId: profile.id })
  }

  /** Transfers to this account and the owners it takes payouts for, newest first. */
  async history() {
    const profileIds = (await this.payoutProfiles()).map((profile) => profile.id)
    const payouts = await Payout.query()
      .whereRaw(...this.payee(profileIds))
      .latest('createdAt')
      .paginate(perPage(this.query, { perPage: 20, maxPerPage: 50 }))

    return new PayoutCollection(payouts).additional({ status: 'success', message: 'OK', code: 200 })
  }

  private async saveFor(holder: PayoutHolder) {
    const data = await this.validate(ACCOUNT_RULES)
    const account = await PayoutAccount.save(holder, this.user, String(data.bankCode), String(data.accountNumber))

    return new PayoutAccountResource(account).additional({ status: 'success', message: `Payouts go to ${account.accountName}.`, code: 200 })
  }

  /** Owner profiles whose bank details this account sets, at most 100. */
  private async payoutProfiles(): Promise<OwnerProfile[]> {
    const rows = await OwnerProfile.query()
      .whereRaw('(user_id = ? or (user_id is null and created_by_id = ?))', [this.user.id, this.user.id])
      .oldest('createdAt')
      .limit(100)
      .get()

    return rows.all()
  }

  /** Rows paid to this account or one of `profileIds`. */
  private payee(profileIds: string[]): [string, unknown[]] {
    if (!profileIds.length) return ['user_id = ?', [this.user.id]]

    return [`(user_id = ? or owner_profile_id in (${profileIds.map(() => '?').join(', ')}))`, [this.user.id, ...profileIds]]
  }

  /**
   * What's owed and not yet sent, and what was paid, across the account and its owners, in each
   * currency they earned in. The top-level amounts are for the first of them, the default currency when there are none.
   */
  private async totals(profileIds: string[]) {
    const [clause, bindings] = this.payee(profileIds)
    const rows = await DB.raw<{ currency: string; due: string | number | null; paid: string | number | null }>(
      `select currency,
          abs(sum(case when kind = 'payout_due' then amount_minor else 0 end)) as due,
          abs(sum(case when kind = 'paid_out' then amount_minor else 0 end)) as paid
        from ledger_entries where kind in ('payout_due', 'paid_out') and ${clause}
        group by currency order by currency limit 50`,
      bindings,
    )
    const totals = rows.all().map((row) => ({ currency: row.currency, owedMinor: Number(row.due ?? 0) - Number(row.paid ?? 0), paidMinor: Number(row.paid ?? 0) }))
    const main = totals[0] ?? { currency: await PaymentRegions.defaultCurrency(), owedMinor: 0, paidMinor: 0 }

    return { ...main, totals }
  }
}
