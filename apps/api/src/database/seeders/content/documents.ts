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
    summary: 'Your brand, on billboards anywhere.',
    sort: 0,
    body: `
Greyboards puts your brand on billboards anywhere in the world, without you ever leaving your desk. Explore real boards on a live map, book the one that fits, and watch your ad go up through photos taken right at the board.

We're starting with a few cities and growing every week as scouts bring new boards on.

## For advertisers

Browse boards and digital screens on the map. Every one has real photos, its size, which way it faces and how many people pass it. Pick your dates and book it yourself, share it with other brands, bid on it or make the owner an offer.

Once your ad is up, you'll see photos of it on the board, and you can share a campaign report with your team or clients. The owner only gets paid once your ad is live.

## For board owners

Keep your boards busy without chasing clients. A scout can list and run your board for you. You sign up by text, we let you know whenever it's booked, and we pay you straight to your bank. Bigger owners can manage their boards themselves.

## For scouts

Spot boards, sign up their owners and put them on the map. You earn a share of every booking they get.

## For dispatchers

Print and put up ads near you, at your own prices. Pick up jobs, put the ad up, take a few photos and get paid.

## For agencies and developers

Plug Greyboards into your own tools with the [Greyboards API](/developers).

## Built on trust

Every board and every photo is taken on site, with its location. Scouts and dispatchers are verified before they start, and everyone builds a reputation from real work. [Here's how badges work](/reputation).

Greyboards is made by [Greysoft](https://greysoft.ng).
`,
  },
  {
    slug: 'fees',
    type: 'page',
    title: 'Fees and payouts',
    summary: 'What you pay, who gets what, and when.',
    sort: 1,
    body: `
Advertisers pay the board's listed price, plus the dispatcher's price for printing and putting up the ad. That's it. No hidden fees.

## Where the money goes

| Who | Share |
| --- | --- |
| Board owner | {{revenue.owner_percent}}% |
| Greyboards | {{revenue.platform_percent}}% |
| Scout who brought the board on | {{revenue.scout_percent}}% |
| If there's no scout, their share goes to | {{revenue.unscouted_to}} |

The listed price already includes everyone's share. If a scout has agreed a fixed amount with an owner, we set the listed price so the owner gets exactly that.

Shares are locked in when an owner signs and when a booking is paid, so later changes don't affect them.

## Printing

Dispatchers set their own prices. You pay this on top of the board price, and it all goes to the dispatcher.

## When everyone gets paid

- We hold your payment safely from the moment you book.
- Once your ad is up, you have {{proofs.accept_hours}} hours to check the photos. If you don't reply, we accept them for you.
- Everyone is paid {{payouts.hold_days}} days later, straight to the bank account they added in Settings.

Need to cancel? See [cancellations and refunds](/pages/refunds).
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

- You must be 18 or older, or the age of majority where you live if that is higher, and able to enter into a binding agreement.
- Give your real name and an email address you can open.
- Keep your password to yourself. You are responsible for what happens in your account.
- Scouts and dispatchers are checked before they can take on work, and may be asked for ID and bank details.

## What Greyboards does

Greyboards is a marketplace. Owners list boards, advertisers book them, and dispatchers print and put up the ads. We run the listings, hold payments, check that ads went up and pay everyone. We don't own the boards listed unless a listing says so.

## Boards and bookings

- Only list boards you own or have a signed agreement to market.
- Board photos and locations must be real and taken on site.
- Once paid, a booking reserves the board for its dates. While you check out, we hold the dates for {{bookings.hold_minutes}} minutes.
- Advertisers are responsible for their artwork and for meeting our [advertising standards](/pages/advertising-standards).
- We hold payments until the advertiser accepts the photos of their ad, then pay everyone as shown on [fees and payouts](/pages/fees).

## Bids, offers and shared bookings

- A winning bid or an accepted offer must be paid within {{bids.pay_hours}} hours, or the dates go to the next bidder.
- In a shared booking, each person pays their own share. If some shares are still unpaid when time runs out, the board can go up for bids and anyone who paid gets a refund.

## Cancellations and disputes

Cancelling a booking is covered by our [cancellations and refunds](/pages/refunds) policy. If something goes wrong with a booking, you can report a problem up to {{disputes.window_days}} days after its last day, and our team will sort it out.

## What's not allowed

- Anything illegal or misleading, or that breaks our advertising standards or a board owner's rules.
- Fake boards, fake photos, or paying outside Greyboards.
- Contacting people you met on Greyboards to book or pay outside it.
- Disrupting the service, sending it automated traffic outside the API, or breaking into accounts.

We may remove listings or ads, cancel bookings, hold payouts, or suspend accounts that break these rules.

## Liability

We work hard to keep Greyboards running and to check boards and proof, but we can't promise the service will always be available or free of errors. Boards are run by their owners, and weather, damage or the authorities can affect them. Where a board can't show your ad as booked, our refund and dispute rules apply. As far as the law allows, we are not liable for indirect losses, and our liability for a booking is limited to what was paid for it.

## Changes and law

We may update these terms as Greyboards changes. We'll update the date on this page, and tell you by email or in the app when a change is important. These terms are governed by the laws of the Federal Republic of Nigeria, where Greysoft is based. This doesn't take away any rights the law where you live gives you that can't be waived by agreement.

Boards are in many countries. Local law where a board stands, including advertising and signage rules, still applies to bookings on it.
`,
  },
  {
    slug: 'privacy',
    type: 'policy',
    title: 'Privacy policy',
    summary: 'What Greyboards collects, why, who sees it, and the choices you have.',
    sort: 11,
    body: `
This policy explains what Greyboards collects when you use it, why, and what you can do about it. Greyboards is run by Greysoft ("we", "us"). We handle your information in line with the data protection laws that apply to you, such as the GDPR in the European Union and United Kingdom and the Nigeria Data Protection Act.

## What we collect

**Your account.** Your name, email address, phone number, profile photo, and the roles you hold (advertiser, owner, scout or dispatch). Your password is stored scrambled, so nobody can read it, us included.

**Checks for scouts and dispatchers.** They may send a photo of a government ID and bank details, so we can confirm who they are before they start.

**Board owners.** An owner's name and phone number, the agreement they signed by text, and the boards it covers.

**Boards and bookings.** Board photos, locations and details, the bookings you make or take, artwork, messages, reviews, and photos of ads on boards.

**Location.** The mobile app only uses your location and compass while you're taking a photo of a board. We don't track you otherwise.

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

## Moving information between countries

Greyboards is used around the world, so your information may be stored or handled in countries other than your own, including Nigeria, where Greysoft is based, and wherever our providers run their servers. When it moves, we use the safeguards the law requires, such as standard contract terms.

## Your rights

You can ask to see, correct or delete your information, object to how we use it, or take a copy of it.

- Change your details in Settings.
- Delete your account from Settings → Delete account.
- For anything else, contact us through [greysoft.ng](https://greysoft.ng). You can also complain to the data protection authority where you live.

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
We hold your payment until your ad is up, so you can get your money back if a booking doesn't go ahead.

## Cancelling a booking

- **Up to {{bookings.full_refund_days}} days before it starts**, you get a full refund.
- **Closer to the start date**, you get {{bookings.late_refund_percent}}% of the board price back, plus the printing price if nothing has been printed yet. The rest goes to the owner and Greyboards.
- **Once the ad is up**, you can't cancel. If something's wrong, report a problem instead.

Cancel from the booking's page. You'll see exactly how much you'll get back before you confirm.

## When we cancel

You get a full refund if:

- the owner or Greyboards cancels the booking,
- the board can't be used for your dates, or
- your shared booking or winning bid falls through and you had already paid.

## Problems with a booking

If your ad wasn't put up, went up late or wrong, or the board was damaged, report it from the booking up to {{disputes.window_days}} days after its last day. We'll hold the payment while we look into it. Our team can refund you in full or in part, or pay the owner.

## How refunds are paid

Refunds go back to the card or account you paid with, in the same currency. Most arrive within 5 to 10 working days, depending on your bank.
`,
  },
  {
    slug: 'advertising-standards',
    type: 'policy',
    title: 'Advertising standards',
    summary: 'What ads can and can’t show on boards booked through Greyboards.',
    sort: 14,
    body: `
Billboards are seen by everyone who passes, children included. Every ad booked through Greyboards must follow these standards, the law where the board stands, and the rules of the board's owner. Where local rules are stricter than ours, the local rules win.

## Approvals

- Advertisers are responsible for any approval their ad needs in the board's country, such as pre-approval by an advertising regulator where one is required.
- Owners are responsible for the board's own permits from the local authorities.

## Not allowed

- Anything illegal, or that promotes illegal goods or services.
- False or misleading claims about a product, price or result.
- Hate, harassment, or content that demeans people for who they are.
- Violence, weapons, or sexual content.
- Tobacco, and gambling, alcohol or other restricted products where the law or the board's location doesn't allow them.
- Political or religious ads that break local election law or attack others.
- Another business's brand, or a person's image, used without permission.
- Content that could distract or confuse drivers, like fake road signs.

## Checking artwork

The board's owner, or the scout who runs it, checks every design before it's printed and can ask for changes. We may also review any ad. Artwork that breaks these standards can be refused, or taken down if it is already up. If an ad is refused or removed because it breaks these standards, our [refund rules](/pages/refunds) for late cancellations apply.

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

If a scout signs you up, you'll get the agreement by text. The link works for {{agreements.link_days}} days, and you sign by entering a code we send to your phone. Your agreement shows your share, and that share stays the same for as long as the agreement lasts.

## What you promise

- You own the board, or have the right to rent it out, and it has the permits it needs.
- The details and photos of your board are true.
- Booked dates are kept free for the advertiser, and the board is safe and fit to post on.
- You won't take bookings for the same dates outside Greyboards.

## Bookings and artwork

We'll text you whenever your board is booked. You, or your scout, check each design before it's printed and can turn down anything that breaks our [advertising standards](/pages/advertising-standards).

## Getting paid

We pay your share ({{revenue.owner_percent}}% unless your agreement says otherwise) straight to your bank once the advertiser accepts the photos of their ad. See [fees and payouts](/pages/fees).

## Ending your listing

You can ask us to stop taking new bookings for your board at any time. Bookings that are already paid will still go ahead.
`,
  },
  {
    slug: 'partner-terms',
    type: 'policy',
    title: 'Scout and dispatch terms',
    summary: 'What scouts and dispatchers agree to when they work through Greyboards.',
    sort: 16,
    body: `
These terms apply to scouts and dispatchers. They add to our [terms of use](/terms). You work for yourself, not for Greysoft, and you are responsible for your own tax and any registration your country requires.

## Getting approved

Before you start, we check who you are. We may ask for a photo of a government ID and a bank account in your own name. We can decline or suspend an account at any time, for example after fraud, missed jobs or repeated complaints.

## For scouts

- Only sign owners who agree freely, and explain the agreement and their share honestly.
- Take every board photo on site, with your phone's location turned on. We check for duplicates and may reject boards.
- You earn {{revenue.scout_percent}}% of every booking on the boards you bring in, for as long as their agreement lasts.

## For dispatch

- Set your own prices, and only take jobs you can do.
- Follow local rules for posting, including any permits or safety requirements where the board stands.
- Print the design as approved, and upload a photo of the print {{printing.print_by_days}} days before the ad goes live.
- Put the ad up by the start date, and send at least {{proofs.min_photos}} photos taken within {{proofs.max_distance_m}} metres of the board.
- If you miss a deadline you lose the job, and repeated misses can get your account suspended.
- You're paid once the advertiser accepts your photos.

## Safety

Work at height is dangerous. Use proper equipment, follow the law and the owner's rules, and never put yourself or others at risk.

## Reputation

Good work builds your reputation, and missed jobs lower it. See [how badges work](/reputation).
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
