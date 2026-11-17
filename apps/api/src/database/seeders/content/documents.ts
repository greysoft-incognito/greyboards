import type { DocumentType } from '@app/models/Document'

export interface DocumentSeed {
  slug: string
  type: DocumentType
  title: string
  summary: string
  sort: number
  body: string
}

/** First drafts of the about page, privacy policy and terms of use. Admins edit them in the dashboard. */
export const DOCUMENTS: DocumentSeed[] = [
  {
    slug: 'about',
    type: 'page',
    title: 'About Greyboards',
    summary: 'Billboards anywhere, booked online. Book it, see it, pay only when it is up.',
    sort: 0,
    body: `
Greyboards is a marketplace for outdoor advertising that works entirely online. Find a billboard anywhere, book it, upload your artwork and see photo proof that it went up, without ever visiting the site.

## For advertisers

Search a live map of boards, check each board's photos, size and facing direction, pick your dates and pay. We hold your payment until geotagged photos show your ad on the board.

## For board owners

Scouts sign you up in person and run your board for you. You get a text when it's booked and a bank transfer once the ad is up. Larger owners can list and manage their boards themselves.

## For scouts

Find boards, sign their owners and put the boards on the map. You earn a share of every booking on the boards you bring in.

## For billposters

Find booked boards near you that need printing, reserve the job, print the artwork and put it up. You're paid once the proof is accepted.

Greyboards is made by [Greysoft](https://greysoft.ng).
`,
  },
  {
    slug: 'privacy',
    type: 'policy',
    title: 'Privacy policy',
    summary: 'What Greyboards collects, why, who sees it, and the choices you have.',
    sort: 1,
    body: `
This policy explains what Greyboards collects when you use it, why, and what you can do about it. Greyboards is run by Greysoft ("we", "us").

## What we collect

**Your account.** Your name, email address, username, profile photo, and the roles you hold (advertiser, owner, scout or billposter). Your password is stored scrambled, so nobody can read it, us included.

**Boards and bookings.** Board photos, locations and details, the bookings you make or take, artwork, and proof photos.

**Location.** The mobile app reads your location and compass only while you capture a board or proof photo. We don't track you otherwise.

**Payouts.** Bank details for owners, scouts and billposters, so we can pay them.

## How we use it

- To run your account and the bookings you're part of.
- To check boards, owners and partners, and to prevent fraud.
- To pay owners, scouts and billposters.
- To tell you about your account and bookings by email, text or in the app.

## Who sees it

Advertisers see a board's photos, location and details. The people on a booking see what they need to deliver it. We use providers for hosting, file storage, email and text delivery, and payments; they only get what they need to do that job. We may also share information when the law requires it.

## Your choices

- Change your details in Settings.
- Delete your account from Settings → Delete account.

If we change this policy, we'll update the date on this page and tell you about important changes by email or in the app.
`,
  },
  {
    slug: 'terms',
    type: 'policy',
    title: 'Terms of use',
    summary: 'The rules for using Greyboards.',
    sort: 2,
    body: `
These terms are the agreement between you and Greysoft ("we", "us") for using Greyboards on the web and on your phone. By making an account or using the app, you agree to them. Our [privacy policy](/privacy) explains how we handle your information.

## Your account

- Give your real name and an email address you can open.
- Keep your password to yourself. You're responsible for what happens in your account.
- Scouts and billposters are reviewed before they can take on work, and may be asked for ID and bank details.

## Boards and bookings

- Only list boards you own or have a signed agreement to market.
- Board photos and locations must be real and captured on site.
- Advertisers are responsible for their artwork and for any permits their ad needs, unless a booking says otherwise.
- Payments are held until proof of posting is accepted, then paid out after our commission.

## What's not allowed

- Anything illegal, misleading, or that breaks a board owner's ad rules.
- Fake boards, fake proof, or getting around our payments.
- Disrupting the app, sending it automated traffic, or breaking into accounts.

We may remove listings, cancel bookings, or suspend accounts that break these rules.

## Changes

We may update these terms as the app changes. We'll update the date on this page, and tell you by email or in the app when a change is important.
`,
  },
]
