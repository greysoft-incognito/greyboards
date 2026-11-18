import type { DocumentType } from '@app/models/Document'

export interface DocumentSeed {
  slug: string
  type: DocumentType
  title: string
  summary: string
  sort: number
  body: string
}

/**
 * First drafts of the about page, fees page and policies. Admins edit them in the dashboard.
 * `{{ group.field }}` shows that setting's current value, so figures follow the dashboard.
 */
export const DOCUMENTS: DocumentSeed[] = [
  {
    slug: 'about',
    type: 'page',
    title: 'About Greyboards',
    summary: 'Billboards anywhere, booked online. Book it, see it, pay only when it is up.',
    sort: 0,
    body: `
Greyboards is a marketplace for outdoor advertising that works entirely online. Find a billboard, book it, upload your artwork and see photo proof that it went up, without ever visiting the site. We are starting in Kaduna and growing city by city.

## For advertisers

Search a live map of boards and screens, check each board's photos, size, facing direction and traffic, pick your dates and pay. Book a board on your own, share it with other advertisers for the same dates, bid on it, or make the owner an offer. We hold your payment until geotagged photos show your ad on the board, and you can share a campaign report with anyone.

## For board owners

Scouts sign you up in person and run your board for you. You agree by text, get a message when your board is booked, and are paid to your bank once the ad is up. Larger owners can list and manage their boards themselves.

## For scouts

Find boards, sign their owners and put the boards on the map. You earn a share of every booking on the boards you bring in.

## For dispatch

Set your own prices to print and post. Take jobs near you, print the artwork, put it up and send the proof photos. You are paid once the advertiser accepts the proof.

## For agencies and developers

Search boards and book them from your own systems with the [Greyboards API](/developers).

## Trust

Every board and proof photo is taken on site with its location and direction. Partners are checked before they take on work, and each role earns a reputation from finished work. See [how badges work](/reputation).

Greyboards is made by [Greysoft](https://greysoft.ng).
`,
  },
  {
    slug: 'fees',
    type: 'page',
    title: 'Fees and payouts',
    summary: 'How a booking’s money is shared, and when everyone is paid.',
    sort: 1,
    body: `
Advertisers pay the board's rent, plus the printing and posting price of the dispatcher who takes the job. There are no other charges for advertisers.

## How the rent is shared

| Who | Share of the rent |
| --- | --- |
| Board owner | {{revenue.owner_percent}}% |
| Greyboards | {{revenue.platform_percent}}% |
| Scout who brought the board in | {{revenue.scout_percent}}% |
| With no scout, the scout's share goes to | {{revenue.unscouted_to}} |

A board's listed rent already includes everyone's share. When a scout agrees a fixed amount with an owner, the listed rent is set so the owner receives that amount in full.

An owner's agreement keeps the share it was signed at, and a paid booking keeps the split it was paid with, even if these figures change later.

## Printing and posting

Dispatchers set their own price for printing and posting. It is paid on top of the rent and goes to the dispatcher in full.

## When money moves

- Your payment is held by Greyboards from the moment you pay.
- Once the ad is up, the advertiser has {{proofs.accept_hours}} hours to check the proof photos. After that, the proof counts as accepted.
- Payouts go out {{payouts.hold_days}} days after the proof is accepted, to the bank account each person added in Settings.

See [cancellations and refunds](/pages/refunds) for what happens when a booking is cancelled.
`,
  },
  {
    slug: 'terms',
    type: 'policy',
    title: 'Terms of use',
    summary: 'The rules for using Greyboards.',
    sort: 10,
    body: `
These terms are the agreement between you and Greysoft ("we", "us") for using Greyboards on the web, on your phone and through our API. By making an account or using Greyboards, you agree to them. Our [privacy policy](/privacy) explains how we handle your information.

Some roles have their own terms as well: [board owner terms](/pages/owner-terms), [scout and dispatch terms](/pages/partner-terms) and the [API terms](/pages/api-terms). Ads must follow our [advertising standards](/pages/advertising-standards).

## Your account

- You must be 18 or older, and able to enter into a binding agreement.
- Give your real name and an email address you can open.
- Keep your password to yourself. You are responsible for what happens in your account.
- Scouts and dispatchers are checked before they can take on work, and may be asked for ID and bank details.

## What Greyboards does

Greyboards is a marketplace. Owners list boards, advertisers book them, and dispatchers print and post the ads. We run the listings, hold payments, check proof of posting and pay everyone out. We are not the owner of the boards listed, unless a listing says so.

## Boards and bookings

- Only list boards you own or have a signed agreement to market.
- Board photos and locations must be real and taken on site.
- A booking holds the board for its dates once paid. Unpaid dates are held for {{bookings.hold_minutes}} minutes while you check out.
- Advertisers are responsible for their artwork and for meeting our [advertising standards](/pages/advertising-standards).
- Payments are held until proof of posting is accepted, then paid out as shown on [fees and payouts](/pages/fees).

## Bids, offers and shared bookings

- A winning bid or an accepted offer must be paid within {{bids.pay_hours}} hours, or the dates go to the next bidder.
- In a shared booking, each person pays their own share. If shares are still unpaid when the booking locks, the board can go up for bids and anyone who paid is refunded.

## Cancellations and disputes

Cancelling a booking is covered by our [cancellations and refunds](/pages/refunds) policy. If something goes wrong with a booking, you can raise a dispute up to {{disputes.window_days}} days after its last day, and our staff will decide it.

## What's not allowed

- Anything illegal or misleading, or that breaks our advertising standards or a board owner's rules.
- Fake boards, fake proof, or getting around our payments.
- Contacting people you met on Greyboards to book or pay outside it.
- Disrupting the service, sending it automated traffic outside the API, or breaking into accounts.

We may remove listings or ads, cancel bookings, hold payouts, or suspend accounts that break these rules.

## Liability

We work hard to keep Greyboards running and to check boards and proof, but we can't promise the service will always be available or free of errors. Boards are run by their owners, and weather, damage or the authorities can affect them. Where a board can't show your ad as booked, our refund and dispute rules apply. As far as the law allows, we are not liable for indirect losses, and our liability for a booking is limited to what was paid for it.

## Changes and law

We may update these terms as Greyboards changes. We'll update the date on this page, and tell you by email or in the app when a change is important. These terms are governed by the laws of the Federal Republic of Nigeria.
`,
  },
  {
    slug: 'privacy',
    type: 'policy',
    title: 'Privacy policy',
    summary: 'What Greyboards collects, why, who sees it, and the choices you have.',
    sort: 11,
    body: `
This policy explains what Greyboards collects when you use it, why, and what you can do about it. Greyboards is run by Greysoft ("we", "us"), and we handle your information in line with the Nigeria Data Protection Act 2023.

## What we collect

**Your account.** Your name, email address, phone number, profile photo, and the roles you hold (advertiser, owner, scout or dispatch). Your password is stored scrambled, so nobody can read it, us included.

**Checks for partners.** Scouts and dispatchers may send a photo of a government ID and bank details, so we can confirm who they are before they take on work.

**Board owners.** An owner's name and phone number, the agreement they signed by text, and the boards it covers.

**Boards and bookings.** Board photos, locations and details, the bookings you make or take, artwork, messages on a booking, reviews, and proof photos.

**Location.** The mobile app reads your location and compass only while you take a board or proof photo. We don't track you otherwise.

**Payments.** Our payment provider handles card details; we only keep a record of each payment. We keep the bank details you add for payouts.

**Use of the service.** The devices you sign in on, and basic logs that keep the service running and secure.

## How we use it

- To run your account and the bookings you're part of.
- To check boards, owners and partners, and to prevent fraud.
- To pay owners, scouts and dispatchers, and to handle refunds and disputes.
- To tell you about your account and bookings by email, text or in the app.
- To work out reputation and reviews from finished work.

We rely on our agreement with you to run the service, on our legitimate interest in keeping it safe, and on the law where we must keep records.

## Who sees it

Advertisers see a board's photos, location and details. The people on a booking see what they need to deliver it. Public profiles show your name, roles, badges and reviews. We use providers for hosting, file storage, email and text delivery, and payments; they only get what they need to do that job. We may also share information when the law requires it.

## How long we keep it

We keep your account details while your account is open. Payment, payout and booking records are kept for as long as tax and accounting law requires, even after you delete your account.

## Your rights

You can ask to see, correct or delete your information, object to how we use it, or take a copy of it.

- Change your details in Settings.
- Delete your account from Settings → Delete account.
- For anything else, contact us through [greysoft.ng](https://greysoft.ng). You can also complain to the Nigeria Data Protection Commission.

See our [cookie policy](/pages/cookies) for what the website stores in your browser.

If we change this policy, we'll update the date on this page and tell you about important changes by email or in the app.
`,
  },
  {
    slug: 'cookies',
    type: 'policy',
    title: 'Cookie policy',
    summary: 'What the Greyboards website stores in your browser.',
    sort: 12,
    body: `
Cookies are small files a website keeps in your browser. Greyboards uses as few as it can.

## What we use

| Cookie | What it's for | How long |
| --- | --- | --- |
| greyboards_token | Keeps you signed in | 30 days, or until you sign out |

It is needed for the website to work, so it can't be turned off.

We don't use advertising or tracking cookies, and we don't sell what we learn about you. Our payment provider may set its own cookies on its checkout page.

The mobile app doesn't use cookies. It keeps your sign-in in your phone's secure storage.

## Your choices

You can clear or block cookies in your browser's settings. If you block them, you won't be able to sign in on the website.

Read our [privacy policy](/privacy) for more on how we handle your information.
`,
  },
  {
    slug: 'refunds',
    type: 'policy',
    title: 'Cancellations and refunds',
    summary: 'When you can cancel a booking, and how much comes back.',
    sort: 13,
    body: `
Your payment is held by Greyboards until your ad is up and the proof is accepted, so money can come back to you if a booking doesn't go ahead.

## Cancelling a booking

- **Up to {{bookings.full_refund_days}} days before it starts**, cancel for all your money back.
- **Later, before it starts**, you get {{bookings.late_refund_percent}}% of the rent back. The printing and posting price comes back too if nothing was printed yet. The rest of the rent goes to the owner and Greyboards.
- **Once the ad is up**, the booking can't be cancelled. If something is wrong, raise a dispute.

Cancel from the booking's page. You'll see what comes back before you confirm.

## When we cancel

You get all your money back if:

- the owner or Greyboards cancels the booking,
- the board can't be used for your dates, or
- your shared booking or winning bid falls through and you had already paid.

## Disputes

If the ad wasn't put up as booked, was put up late or wrongly, or the board was damaged, raise a dispute from the booking up to {{disputes.window_days}} days after its last day. While a dispute is open, the money stays held. Our staff can refund you in full or in part, or release the money to the owner.

## How refunds are paid

Refunds go back to the card or account you paid with, through our payment provider. Most arrive within 5 to 10 working days, depending on your bank.
`,
  },
  {
    slug: 'advertising-standards',
    type: 'policy',
    title: 'Advertising standards',
    summary: 'What ads can and can’t show on boards booked through Greyboards.',
    sort: 14,
    body: `
Billboards are seen by everyone who passes, children included. Every ad booked through Greyboards must follow these standards, the law, and the rules of the board's owner.

## Approvals

- Advertisers are responsible for any approval their ad needs, including vetting by the Advertising Regulatory Council of Nigeria (ARCON) where it applies.
- Owners are responsible for the board's own permits from the state signage agency and the local government.

## Not allowed

- Anything illegal, or that promotes illegal goods or services.
- False or misleading claims about a product, price or result.
- Hate, harassment, or content that demeans people for who they are.
- Violence, weapons, or sexual content.
- Tobacco, and gambling or alcohol ads where the law or the board's location doesn't allow them.
- Political or religious ads that break electoral law or attack others.
- Another business's brand, or a person's image, used without permission.
- Content that could distract or confuse drivers, like fake road signs.

## Checking artwork

The board's owner, or the scout who runs it, checks the artwork before it is printed and can ask for changes. We may also review any ad. Artwork that breaks these standards can be refused, or taken down if it is already up. If an ad is refused or removed because it breaks these standards, our [refund rules](/pages/refunds) for late cancellations apply.

## Reporting an ad

If you see an ad on a Greyboards board that you think breaks these standards, contact us through [greysoft.ng](https://greysoft.ng) with the board's location.
`,
  },
  {
    slug: 'owner-terms',
    type: 'policy',
    title: 'Board owner terms',
    summary: 'What owners agree to when their boards are listed on Greyboards.',
    sort: 15,
    body: `
These terms apply to everyone whose board is listed on Greyboards, whether they listed it themselves or a scout signed them up. They add to our [terms of use](/terms).

## Your agreement

A scout who signs you up sends you an agreement by text. The link works for {{agreements.link_days}} days, and you agree by confirming the code we send to your phone. Your agreement states your share of the rent, and keeps that share for as long as it lasts.

## What you promise

- You own the board, or have the right to rent it out, and it has the permits it needs.
- The details and photos of your board are true.
- Booked dates are kept free for the advertiser, and the board is safe and fit to post on.
- You won't take bookings for the same dates outside Greyboards.

## Bookings and artwork

You get a text when your board is booked. You, or the scout who runs your board, check each ad's artwork before it is printed and can refuse artwork that breaks our [advertising standards](/pages/advertising-standards).

## Getting paid

You are paid your share of the rent, {{revenue.owner_percent}}% unless your agreement says otherwise, to your bank account after the proof is accepted. See [fees and payouts](/pages/fees).

## Ending your listing

You can ask us to stop taking new bookings for your board at any time. Bookings already paid for still go ahead.
`,
  },
  {
    slug: 'partner-terms',
    type: 'policy',
    title: 'Scout and dispatch terms',
    summary: 'What scouts and dispatchers agree to when they work through Greyboards.',
    sort: 16,
    body: `
These terms apply to scouts and dispatchers. They add to our [terms of use](/terms). You work for yourself, not for Greysoft, and you are responsible for your own tax.

## Getting approved

Before you take on work, we check who you are. We may ask for a photo of a government ID and a bank account in your own name. We can turn down or suspend a partner account at any time, for example after fraud, missed jobs or repeated complaints.

## For scouts

- Only sign owners who agree freely, and explain the agreement and their share honestly.
- Take every board photo on site, with your phone's location turned on. We check for duplicates and may reject boards.
- You earn {{revenue.scout_percent}}% of the rent on every paid booking for the boards you bring in, while their agreement lasts.

## For dispatch

- Set your own price for printing and posting, and only reserve jobs you can do.
- Print the artwork as approved, and show the finished print {{printing.print_by_days}} days before the ad goes live.
- Post the ad by the start date, and send at least {{proofs.min_photos}} proof photos taken within {{proofs.max_distance_m}} metres of the board.
- Missing a deadline loses you the job, and repeated misses can suspend your account.
- You are paid your price once the advertiser accepts the proof.

## Safety

Work at height is dangerous. Use proper equipment, follow the law and the owner's rules, and never put yourself or others at risk.

## Reputation

Finished work earns you reputation, and missed work lowers it. See [how badges work](/reputation).
`,
  },
  {
    slug: 'api-terms',
    type: 'policy',
    title: 'API terms',
    summary: 'The rules for using the Greyboards API.',
    sort: 17,
    body: `
These terms apply when you use the [Greyboards API](/developers). They add to our [terms of use](/terms).

## Keys

- Make API keys in Settings → API keys. Keep them secret, and never put them in an app or web page other people can open.
- You are responsible for everything done with your keys. Delete a key straight away if you think it has leaked.

## Fair use

- Each key can make {{public_api.requests_per_minute}} requests a minute. Requests past that wait until the minute is up.
- Don't use the API to copy our listings in bulk, rebuild Greyboards, or resell its data.
- Bookings made through the API are real bookings, with the same payments, refund and dispute rules.

## Changes

We may change the API, add limits, or turn off keys that break these terms. We'll tell key holders before making a change that breaks existing integrations, unless we must act quickly to keep the service safe.
`,
  },
]
