import { AccountRole } from '@app/models/AccountRole'
import { IdentityCheck } from '@app/models/IdentityCheck'
import { OwnerProfile } from '@app/models/OwnerProfile'
import { PayoutAccount } from '@app/models/PayoutAccount'
import { User } from '@app/models/User'
import { PaymentRegions } from '@app/services/payments/PaymentRegions'
import { Hash } from '@arkstack/common'
import { OWNERS, PEOPLE, type MockBank, type MockPersonSeed } from '../content/people'
import { MockData } from '../MockData'
import { MockSeeder } from '../MockSeeder'

const DOCUMENTS: Record<string, string> = {
  nin: 'National ID',
  passport: 'Passport',
  drivers_licence: 'Driver’s licence',
  voters_card: 'Voter’s card',
}

/** Staff, everyone in a marketplace role, their ID checks and bank details, and the owners scouts signed up. */
export class MockPeopleSeeder extends MockSeeder {
  async run(): Promise<void> {
    await this.users()
    await this.roles()
    await this.identityChecks()
    await this.ownerProfiles()
    await this.payoutAccounts()
  }

  private async users(): Promise<void> {
    const password = await Hash.make(MockData.PASSWORD)
    const rows = []

    for (const person of PEOPLE) {
      const user = this.data.keep('users', person.key, { id: this.data.id(), name: person.name, country: person.country, joinedDaysAgo: person.joinedDaysAgo })

      rows.push({
        id: user.id,
        name: person.name,
        email: person.email,
        username: await User.freeUsername(person.email),
        password,
        emailVerifiedAt: this.data.at(-person.joinedDaysAgo, 1),
        role: person.staff ?? 'user',
        ...this.data.stamps(-person.joinedDaysAgo),
      })
    }

    await this.data.insert(User, rows)
  }

  private async roles(): Promise<void> {
    const admin = this.data.get('users', 'admin')
    const rows = PEOPLE.flatMap((person) =>
      person.roles.map((role) => {
        const record = this.data.keep('roles', `${person.key}:${role.kind}`, { id: this.data.id(), userId: this.data.get('users', person.key).id })
        const reviewed = AccountRole.definition(role.kind).needsReview && role.status !== 'pending'

        return {
          id: record.id,
          userId: record.userId,
          kind: role.kind,
          status: role.status,
          note: role.note ?? null,
          reviewedById: reviewed ? admin.id : null,
          reviewedAt: reviewed ? this.data.at(-person.joinedDaysAgo + 2) : null,
          verifiedAt: role.verified ? this.data.at(-person.joinedDaysAgo + 20) : null,
          verifiedById: role.verified ? admin.id : null,
          verifiedNote: role.verified ?? null,
          ...this.data.stamps(-person.joinedDaysAgo),
        }
      }),
    )

    await this.data.insert(AccountRole, rows)
  }

  private async identityChecks(): Promise<void> {
    const admin = this.data.get('users', 'admin')
    const rows = []

    for (const person of PEOPLE.filter((entry) => entry.identity)) {
      const user = this.data.get('users', person.key)
      const status = this.identityStatus(person)
      const photo = await this.data.images.identity(`identity/${user.id}`, person.name, DOCUMENTS[person.identity!]!)

      rows.push({
        id: this.data.id(),
        userId: user.id,
        documentType: person.identity,
        documentNumber: `SAMPLE-${String(rows.length + 1).padStart(4, '0')}`,
        fullName: person.name,
        photoPath: photo.path,
        photoDisk: photo.disk,
        status,
        note: status === 'rejected' ? 'The photo is too blurry to read the name.' : null,
        reviewedById: status === 'submitted' ? null : admin.id,
        reviewedAt: status === 'submitted' ? null : this.data.at(-person.joinedDaysAgo + 2),
        ...this.data.stamps(-person.joinedDaysAgo),
      })
    }

    await this.data.insert(IdentityCheck, rows)
  }

  private async ownerProfiles(): Promise<void> {
    const rows = OWNERS.map((owner) => {
      const creator = this.data.get('users', owner.createdBy)
      const user = this.data.find('users', owner.user)
      const profile = this.data.keep('owners', owner.key, { id: this.data.id(), name: owner.name, phone: owner.phone, userId: user?.id ?? null })
      const daysAgo = Number(creator.joinedDaysAgo) - 5

      return {
        id: profile.id,
        name: owner.name,
        phone: owner.phone,
        userId: profile.userId,
        createdById: creator.id,
        claimedAt: user ? this.data.at(-daysAgo) : null,
        phoneVerifiedAt: this.data.at(-daysAgo),
        ...this.data.stamps(-daysAgo),
      }
    })

    await this.data.insert(OwnerProfile, rows)
  }

  private async payoutAccounts(): Promise<void> {
    const rows = []

    for (const person of PEOPLE.filter((entry) => entry.bank)) {
      const user = this.data.get('users', person.key)

      rows.push(await this.account(person.bank!, person.name, person.country, { userId: user.id, ownerProfileId: null }, user.id, person.joinedDaysAgo))
    }

    for (const owner of OWNERS.filter((entry) => entry.bank)) {
      const profile = this.data.get('owners', owner.key)
      const scout = this.data.get('users', owner.createdBy)

      rows.push(await this.account(owner.bank!, owner.name, String(scout.country), { userId: null, ownerProfileId: profile.id }, scout.id, Number(scout.joinedDaysAgo) - 5))
    }

    await this.data.insert(PayoutAccount, rows)
  }

  private async account(bank: MockBank, name: string, country: string, holder: { userId: string | null; ownerProfileId: string | null }, editorId: string, daysAgo: number) {
    return {
      id: this.data.id(),
      ...holder,
      ...bank,
      accountName: name.toUpperCase(),
      currency: await PaymentRegions.currencyFor(country),
      updatedById: editorId,
      ...this.data.stamps(-daysAgo),
    }
  }

  private identityStatus(person: MockPersonSeed): 'submitted' | 'verified' | 'rejected' {
    const status = person.roles[0]?.status

    if (status === 'pending') return 'submitted'
    if (status === 'rejected') return 'rejected'

    return 'verified'
  }
}
