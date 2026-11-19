import type { Daypart } from '@greyboards/types'
import type { MockAd } from '../MockImages'

/** How far along a booking is. Each stage includes everything before it. */
export type MockStage =
  | 'held'
  | 'expired'
  | 'cancelled'
  | 'paid'
  | 'artwork_submitted'
  | 'artwork_approved'
  | 'printing'
  | 'printed'
  | 'proof_submitted'
  | 'proof_disputed'
  | 'live'
  | 'completed'

export interface MockPrintOfferSeed {
  dispatcher: string
  /** Major units of the board's currency. */
  amount: number
  note?: string
}

export interface MockShareSeed {
  user: string | null
  paid: boolean
  ad?: MockAd
}

export interface MockBookingSeed {
  key: string
  board: string
  face?: number
  advertiser: string
  /** Days from today the booking starts on. */
  startsIn: number
  periods: number
  stage: MockStage
  ad: MockAd
  source?: 'book' | 'offer' | 'bid'
  slots?: { slotStart: number; slots: number; daypart: Daypart }
  /** Who printed and put the ad up, on boards dispatchers print, and what the advertiser paid them. */
  dispatcher?: { user: string; amount: number }
  /** Prices dispatchers sent for a job still open. */
  printOffers?: MockPrintOfferSeed[]
  shares?: MockShareSeed[]
  review?: { rating: number; body: string }
  advertiserReview?: { rating: number; body: string }
  messages?: [string, string][]
  proofNote?: string
  /** A payout that bounced, by ledger account. */
  failedPayout?: 'owner' | 'scout' | 'dispatch'
}

const ad = (brand: string, line: string, colour: string): MockAd => ({ brand, line, colour })

export const ADS = {
  zariaThreads: ad('Zaria Threads', 'Harmattan collection. Now in store.', '#833b4b'),
  payLite: ad('PayLite', 'Send money home in seconds.', '#1f5f8b'),
  okaforMotors: ad('Okafor Motors', 'Drive home a new Corolla this month.', '#46474b'),
  mensahFoods: ad('Mensah Foods', 'Jollof the way grandma made it.', '#b26a00'),
  safariJuice: ad('Safari Juice', 'Fresh from the Rift Valley.', '#1f7a4d'),
  hughesCoffee: ad('Hughes Coffee', 'Roasted in Brixton since 2014.', '#5b3a29'),
  kadunaBooks: ad('Kaduna Book Fair', 'Murtala Square, 12 to 14 December.', '#6e3040'),
}

/** Earlier campaigns on Usman's Kaduna boards, all put up by Yakubu, so he has a track record. */
const HISTORY: MockBookingSeed[] = (
  [
    ['kawo', 1, 'amina', -135, ADS.zariaThreads, 180_000],
    ['kawo', 2, 'chidi', -128, ADS.okaforMotors, 180_000],
    ['kawo', 2, 'tunde', -96, ADS.payLite, 180_000],
    ['kano-road', 1, 'amina', -132, ADS.kadunaBooks, 150_000],
    ['kano-road', 1, 'tunde', -100, ADS.payLite, 150_000],
    ['independence', 1, 'amina', -125, ADS.zariaThreads, 25_000],
    ['independence', 1, 'chidi', -110, ADS.okaforMotors, 25_000],
    ['independence', 1, 'amina', -95, ADS.kadunaBooks, 25_000],
  ] as const
).map(([board, face, advertiser, startsIn, ad, amount], index) => ({
  key: `history-${index + 1}`,
  board,
  face,
  advertiser,
  startsIn,
  periods: board === 'independence' ? 2 : 1,
  stage: 'completed',
  ad,
  dispatcher: { user: 'yakubu', amount },
}))

/**
 * Bookings in every state, on Kaduna boards first and then the rest of the world. Dates are
 * relative to the day the seeder runs. Bookings that hold the same face never overlap.
 */
export const BOOKINGS: MockBookingSeed[] = [
  ...HISTORY,
  {
    key: 'kawo-zaria',
    board: 'kawo',
    advertiser: 'amina',
    startsIn: -80,
    periods: 1,
    stage: 'completed',
    ad: ADS.zariaThreads,
    dispatcher: { user: 'yakubu', amount: 180_000 },
    review: { rating: 5, body: 'Went up the day they promised, and the photos were sharp. We saw more walk-ins that week.' },
    advertiserReview: { rating: 5, body: 'Artwork came in on time and print-ready. Easy to work with.' },
    messages: [
      ['amina', 'Hi, could the ad go up before the 1st? We launch that weekend.'],
      ['yakubu', 'Printed today. We’ll put it up first thing Friday morning.'],
      ['amina', 'Perfect, thank you!'],
    ],
  },
  {
    key: 'kawo-paylite',
    board: 'kawo',
    face: 2,
    advertiser: 'tunde',
    startsIn: -3,
    periods: 1,
    stage: 'live',
    ad: ADS.payLite,
    dispatcher: { user: 'yakubu', amount: 180_000 },
  },
  {
    key: 'kano-zaria',
    board: 'kano-road',
    advertiser: 'amina',
    startsIn: -2,
    periods: 1,
    stage: 'proof_submitted',
    ad: ADS.zariaThreads,
    dispatcher: { user: 'yakubu', amount: 150_000 },
  },
  {
    key: 'kano-mensah',
    board: 'kano-road',
    advertiser: 'grace',
    startsIn: 10,
    periods: 1,
    stage: 'cancelled',
    ad: ADS.mensahFoods,
  },
  {
    key: 'murtala-okafor',
    board: 'murtala',
    advertiser: 'chidi',
    startsIn: -100,
    periods: 1,
    stage: 'completed',
    ad: ADS.okaforMotors,
    dispatcher: { user: 'yakubu', amount: 112_500 },
    review: { rating: 4, body: 'Great spot. The lights were out for two nights, but Halima sorted it quickly.' },
    failedPayout: 'scout',
  },
  {
    key: 'murtala-hughes',
    board: 'murtala',
    advertiser: 'oliver',
    startsIn: 12,
    periods: 1,
    stage: 'artwork_approved',
    ad: ADS.kadunaBooks,
    printOffers: [
      { dispatcher: 'yakubu', amount: 115_000, note: 'Flex banner, printed and up two days before the start.' },
      { dispatcher: 'esther', amount: 128_000, note: 'Can do it with heavy-duty vinyl if you prefer.' },
    ],
  },
  {
    key: 'barnawa-okafor',
    board: 'barnawa',
    advertiser: 'chidi',
    startsIn: 9,
    periods: 1,
    stage: 'artwork_submitted',
    ad: ADS.okaforMotors,
  },
  {
    key: 'market-paylite',
    board: 'central-market',
    advertiser: 'tunde',
    startsIn: 8,
    periods: 2,
    stage: 'held',
    ad: ADS.payLite,
  },
  {
    key: 'market-safari',
    board: 'central-market',
    advertiser: 'wanjiru',
    startsIn: 20,
    periods: 2,
    stage: 'expired',
    ad: ADS.safariJuice,
  },
  {
    key: 'constitution-zaria',
    board: 'constitution',
    advertiser: 'amina',
    startsIn: -5,
    periods: 1,
    stage: 'live',
    ad: ADS.zariaThreads,
    slots: { slotStart: 0, slots: 2, daypart: 'evening' },
  },
  {
    key: 'constitution-paylite',
    board: 'constitution',
    advertiser: 'tunde',
    startsIn: 8,
    periods: 1,
    stage: 'paid',
    ad: ADS.payLite,
    slots: { slotStart: 2, slots: 1, daypart: 'morning' },
  },
  {
    key: 'independence-mensah',
    board: 'independence',
    advertiser: 'grace',
    startsIn: 14,
    periods: 2,
    stage: 'paid',
    ad: ADS.mensahFoods,
  },
  {
    key: 'maitama-okafor',
    board: 'maitama',
    advertiser: 'chidi',
    startsIn: -12,
    periods: 1,
    stage: 'live',
    ad: ADS.okaforMotors,
    slots: { slotStart: 0, slots: 3, daypart: 'all_day' },
  },
  {
    key: 'lugbe-paylite',
    board: 'lugbe',
    advertiser: 'tunde',
    startsIn: 16,
    periods: 1,
    stage: 'paid',
    ad: ADS.payLite,
    source: 'offer',
  },
  {
    key: 'oworonshoki-shared',
    board: 'oworonshoki',
    advertiser: 'tunde',
    startsIn: 20,
    periods: 1,
    stage: 'held',
    ad: ADS.payLite,
    shares: [
      { user: 'tunde', paid: true, ad: ADS.payLite },
      { user: 'amina', paid: true, ad: ADS.zariaThreads },
      { user: null, paid: false },
    ],
  },
  {
    key: 'kawo-shared',
    board: 'kawo',
    advertiser: 'amina',
    startsIn: 25,
    periods: 1,
    stage: 'printing',
    ad: ADS.zariaThreads,
    dispatcher: { user: 'yakubu', amount: 180_000 },
    shares: [
      { user: 'amina', paid: true, ad: ADS.zariaThreads },
      { user: 'chidi', paid: true, ad: ADS.okaforMotors },
    ],
  },
  {
    key: 'lekki-paylite',
    board: 'lekki',
    advertiser: 'tunde',
    startsIn: -70,
    periods: 1,
    stage: 'completed',
    ad: ADS.payLite,
    dispatcher: { user: 'esther', amount: 160_000 },
    review: { rating: 4, body: 'Good board and good crowd. Took a day longer than planned to go up.' },
  },
  {
    key: 'lekki-zaria',
    board: 'lekki',
    advertiser: 'amina',
    startsIn: 6,
    periods: 1,
    stage: 'printed',
    ad: ADS.zariaThreads,
    source: 'bid',
    dispatcher: { user: 'esther', amount: 160_000 },
  },
  {
    key: 'spintex-mensah',
    board: 'spintex',
    advertiser: 'grace',
    startsIn: -8,
    periods: 1,
    stage: 'live',
    ad: ADS.mensahFoods,
    dispatcher: { user: 'kofi', amount: 1_800 },
  },
  {
    key: 'uhuru-safari',
    board: 'uhuru',
    advertiser: 'wanjiru',
    startsIn: -4,
    periods: 1,
    stage: 'proof_disputed',
    ad: ADS.safariJuice,
    proofNote: 'The left half still shows the old ad. Please fix it and send new photos.',
    messages: [
      ['wanjiru', 'The photo shows the old ad still on the left panel.'],
      ['brian', 'Sorry about that. The crew is going back first thing tomorrow to finish it.'],
    ],
  },
  {
    key: 'ngong-safari',
    board: 'ngong',
    advertiser: 'wanjiru',
    startsIn: -40,
    periods: 2,
    stage: 'completed',
    ad: ADS.safariJuice,
    review: { rating: 5, body: 'Small panel but right where our customers wait. Brian kept us posted the whole way.' },
  },
  {
    key: 'old-street-hughes',
    board: 'old-street',
    advertiser: 'oliver',
    startsIn: 10,
    periods: 4,
    stage: 'paid',
    ad: ADS.hughesCoffee,
    slots: { slotStart: 0, slots: 1, daypart: 'all_day' },
  },
  {
    key: 'brixton-hughes',
    board: 'brixton',
    advertiser: 'oliver',
    startsIn: -50,
    periods: 4,
    stage: 'completed',
    ad: ADS.hughesCoffee,
    review: { rating: 5, body: 'Our first billboard. Booked from the office and it just happened.' },
  },
  {
    key: 'westheimer-hughes',
    board: 'westheimer',
    advertiser: 'oliver',
    startsIn: 15,
    periods: 1,
    stage: 'artwork_approved',
    ad: ADS.hughesCoffee,
  },
]

export interface MockOfferSeed {
  board: string
  advertiser: string
  startsIn: number
  periods: number
  /** Percent of the list price offered. */
  percent: number
  status: 'pending' | 'countered' | 'accepted' | 'declined'
  note: string
  counterPercent?: number
  booking?: string
}

export const OFFERS: MockOfferSeed[] = [
  { board: 'kano-road', advertiser: 'grace', startsIn: 35, periods: 1, percent: 85, status: 'pending', note: 'We’d like to run through the new year. Could you do this price?' },
  { board: 'osu', advertiser: 'oliver', startsIn: 20, periods: 1, percent: 70, status: 'countered', counterPercent: 90, note: 'Testing Accra for the first time, so keeping it small.' },
  { board: 'lugbe', advertiser: 'tunde', startsIn: 16, periods: 1, percent: 88, status: 'accepted', booking: 'lugbe-paylite', note: 'Happy to pay upfront for this one.' },
  { board: 'murtala', advertiser: 'wanjiru', startsIn: 50, periods: 1, percent: 60, status: 'declined', note: 'Is there room on the price?' },
]

export interface MockAuctionSeed {
  board: string
  face?: number
  startsIn: number
  periods: number
  closesIn: number
  status: 'open' | 'sold'
  format: 'open' | 'sealed'
  /** Bids as percents of the reserve, highest last. */
  bids: [string, number][]
  booking?: string
}

export const AUCTIONS: MockAuctionSeed[] = [
  { board: 'kawo', face: 2, startsIn: 45, periods: 1, closesIn: 4, status: 'open', format: 'open', bids: [['oliver', 102], ['tunde', 105], ['chidi', 113]] },
  { board: 'lekki', startsIn: 6, periods: 1, closesIn: -9, status: 'sold', format: 'sealed', bids: [['tunde', 102], ['amina', 106]], booking: 'lekki-zaria' },
]
