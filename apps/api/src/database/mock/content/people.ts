import type { AccountRoleKind, AccountRoleStatus } from '@app/models/AccountRole'

export interface MockBank {
  bankCode: string
  bankName: string
  accountNumber: string
}

export interface MockRoleSeed {
  kind: AccountRoleKind
  status: AccountRoleStatus
  /** Staff verified this role, with this note. */
  verified?: string
  note?: string
}

export interface MockPersonSeed {
  key: string
  name: string
  email: string
  /** Staff role slug, for admins and reviewers. */
  staff?: 'admin' | 'reviewer'
  roles: MockRoleSeed[]
  country: string
  joinedDaysAgo: number
  bank?: MockBank
  identity?: 'nin' | 'passport' | 'drivers_licence' | 'voters_card'
}

/** Board owners who don't use the app. Scouts signed them up and run their boards. */
export interface MockOwnerSeed {
  key: string
  name: string
  phone: string
  createdBy: string
  /** Payout details for owners without an account. Owners who use the app are paid into their own. */
  bank?: MockBank
  /** The account that manages this profile, for owners who use the app. */
  user?: string
}

const ngBank = (accountNumber: string): MockBank => ({ bankCode: '058', bankName: 'Guaranty Trust Bank', accountNumber })

/**
 * Everyone in the demo. The first account of each role uses a plain role address, so QA can
 * sign in without looking names up. Emails use example.com and every account shares one password.
 */
export const PEOPLE: MockPersonSeed[] = [
  { key: 'admin', name: 'Greyboards Admin', email: 'admin@example.com', staff: 'admin', roles: [], country: 'NG', joinedDaysAgo: 200 },
  { key: 'reviewer', name: 'Rukayya Idris', email: 'reviewer@example.com', staff: 'reviewer', roles: [], country: 'NG', joinedDaysAgo: 180 },

  { key: 'amina', name: 'Amina Yusuf', email: 'advertiser@example.com', roles: [{ kind: 'advertiser', status: 'active' }], country: 'NG', joinedDaysAgo: 150 },
  { key: 'tunde', name: 'Tunde Bakare', email: 'tunde.bakare@example.com', roles: [{ kind: 'advertiser', status: 'active' }], country: 'NG', joinedDaysAgo: 120 },
  { key: 'chidi', name: 'Chidi Okafor', email: 'chidi.okafor@example.com', roles: [{ kind: 'advertiser', status: 'active' }], country: 'NG', joinedDaysAgo: 140 },
  { key: 'grace', name: 'Grace Mensah', email: 'grace.mensah@example.com', roles: [{ kind: 'advertiser', status: 'active' }], country: 'GH', joinedDaysAgo: 90 },
  { key: 'wanjiru', name: 'Wanjiru Kamau', email: 'wanjiru.kamau@example.com', roles: [{ kind: 'advertiser', status: 'active' }], country: 'KE', joinedDaysAgo: 75 },
  { key: 'oliver', name: 'Oliver Hughes', email: 'oliver.hughes@example.com', roles: [{ kind: 'advertiser', status: 'active' }], country: 'GB', joinedDaysAgo: 110 },

  {
    key: 'ibrahim',
    name: 'Ibrahim Danjuma',
    email: 'owner@example.com',
    roles: [
      { kind: 'owner', status: 'active', verified: 'Met him at the Barnawa site and checked his land papers.' },
      { kind: 'advertiser', status: 'active' },
    ],
    country: 'NG',
    joinedDaysAgo: 170,
    bank: ngBank('0123456789'),
  },
  { key: 'femi', name: 'Femi Adeyemi', email: 'femi.adeyemi@example.com', roles: [{ kind: 'owner', status: 'active' }], country: 'NG', joinedDaysAgo: 130, bank: ngBank('0234567891') },
  { key: 'kwame', name: 'Kwame Asante', email: 'kwame.asante@example.com', roles: [{ kind: 'owner', status: 'active' }], country: 'GH', joinedDaysAgo: 100, bank: { bankCode: 'GH190100', bankName: 'Ecobank Ghana', accountNumber: '1441000000001' } },
  { key: 'sarah', name: 'Sarah Whitfield', email: 'sarah.whitfield@example.com', roles: [{ kind: 'owner', status: 'active' }], country: 'GB', joinedDaysAgo: 115, bank: { bankCode: '200000', bankName: 'Barclays', accountNumber: '00000001' } },
  { key: 'marcus', name: 'Marcus Reed', email: 'marcus.reed@example.com', roles: [{ kind: 'owner', status: 'active' }], country: 'US', joinedDaysAgo: 60, bank: { bankCode: '021000021', bankName: 'Chase', accountNumber: '000000000001' } },

  {
    key: 'usman',
    name: 'Usman Abdullahi',
    email: 'scout@example.com',
    roles: [{ kind: 'scout', status: 'active', verified: 'Walked three Kaduna North sites with him.' }],
    country: 'NG',
    joinedDaysAgo: 165,
    bank: ngBank('0345678912'),
    identity: 'nin',
  },
  { key: 'halima', name: 'Halima Sani', email: 'halima.sani@example.com', roles: [{ kind: 'scout', status: 'active' }], country: 'NG', joinedDaysAgo: 125, bank: ngBank('0456789123'), identity: 'voters_card' },
  { key: 'brian', name: 'Brian Otieno', email: 'brian.otieno@example.com', roles: [{ kind: 'scout', status: 'active' }], country: 'KE', joinedDaysAgo: 85, bank: { bankCode: 'KE68', bankName: 'Equity Bank Kenya', accountNumber: '0000000000001' }, identity: 'passport' },
  { key: 'joseph', name: 'Joseph Akpan', email: 'joseph.akpan@example.com', roles: [{ kind: 'scout', status: 'pending' }], country: 'NG', joinedDaysAgo: 3, identity: 'drivers_licence' },

  {
    key: 'yakubu',
    name: 'Yakubu Garba',
    email: 'dispatch@example.com',
    roles: [{ kind: 'dispatch', status: 'active', verified: 'Visited his print shop on Ahmadu Bello Way.' }],
    country: 'NG',
    joinedDaysAgo: 160,
    bank: ngBank('0567891234'),
    identity: 'nin',
  },
  { key: 'esther', name: 'Esther Nnamdi', email: 'esther.nnamdi@example.com', roles: [{ kind: 'dispatch', status: 'active' }], country: 'NG', joinedDaysAgo: 135, bank: ngBank('0678912345'), identity: 'passport' },
  { key: 'kofi', name: 'Kofi Boateng', email: 'kofi.boateng@example.com', roles: [{ kind: 'dispatch', status: 'active' }], country: 'GH', joinedDaysAgo: 95, bank: { bankCode: 'GH130100', bankName: 'GCB Bank', accountNumber: '1011000000002' }, identity: 'passport' },
  {
    key: 'daniel',
    name: 'Daniel Price',
    email: 'daniel.price@example.com',
    roles: [{ kind: 'dispatch', status: 'rejected', note: 'The ID photo was too blurry to read. Please send a clearer one.' }],
    country: 'GB',
    joinedDaysAgo: 20,
    identity: 'drivers_licence',
  },
  { key: 'aisha', name: 'Aisha Mohammed', email: 'aisha.mohammed@example.com', roles: [{ kind: 'dispatch', status: 'pending' }], country: 'NG', joinedDaysAgo: 2, identity: 'nin' },
]

/** Owners scouts signed up, and the profiles that owners who use the app manage. */
export const OWNERS: MockOwnerSeed[] = [
  { key: 'musa', name: 'Alhaji Musa Bello', phone: '+2348005550101', createdBy: 'usman', bank: ngBank('0789123456') },
  { key: 'zainab', name: 'Hajiya Zainab Lawal', phone: '+2348005550102', createdBy: 'halima', bank: ngBank('0891234567') },
  { key: 'peter', name: 'Peter Mwangi', phone: '+254700555103', createdBy: 'brian', bank: { bankCode: 'KE01', bankName: 'KCB Bank Kenya', accountNumber: '0000000000002' } },
  { key: 'ibrahim', name: 'Ibrahim Danjuma', phone: '+2348005550104', createdBy: 'ibrahim', user: 'ibrahim' },
  { key: 'femi', name: 'Femi Adeyemi', phone: '+2348005550105', createdBy: 'femi', user: 'femi' },
  { key: 'kwame', name: 'Kwame Asante', phone: '+233200555106', createdBy: 'kwame', user: 'kwame' },
  { key: 'sarah', name: 'Sarah Whitfield', phone: '+447700900107', createdBy: 'sarah', user: 'sarah' },
  { key: 'marcus', name: 'Marcus Reed', phone: '+12025550108', createdBy: 'marcus', user: 'marcus' },
]
