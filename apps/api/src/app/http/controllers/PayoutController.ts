import { LedgerEntry } from '@app/models/LedgerEntry'
import { OwnerProfile } from '@app/models/OwnerProfile'
import { Payout } from '@app/models/Payout'
import { PayoutAccount, type PayoutHolder } from '@app/models/PayoutAccount'
import { PayoutAccountResource } from '@app/http/resources/PayoutAccountResource'
import { PayoutCollection } from '@app/http/resources/PayoutCollection'
import { Gateways } from '@app/services/payments/Gateways'
import { Settings } from '@app/support/Settings'
import { BaseController } from './BaseController'
import { GenericResource } from 'resora'
import { RequestException, perPage } from '@arkstack/common'

const ACCOUNT_RULES = {
  bankCode: 'required|string|max:20',
  accountNumber: 'required|digits:10',
}

/** Where money owed is paid, what's owed, and what was sent. */
export default class PayoutController extends BaseController {
  async banks() {
    const banks = await Gateways.payouts().banks(String(await Settings.get('payouts.country')))

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

  /** What's owed and not yet sent, and what was paid, across the account and its owners. */
  private async totals(profileIds: string[]) {
    const sum = async (kind: string) => {
      const query = LedgerEntry.query().where({ kind }).whereRaw(...this.payee(profileIds))

      return Math.abs(Number(await query.sum('amountMinor')) || 0)
    }

    const due = await sum('payout_due')
    const paid = await sum('paid_out')

    return { owedMinor: due - paid, paidMinor: paid }
  }
}
