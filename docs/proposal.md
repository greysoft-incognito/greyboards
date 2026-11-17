# Greyboards: product proposal

Status: draft for discussion. Nothing here is built yet. Percentages and prices are examples to react to, not decisions.

## 1. The idea in one paragraph

Greyboards is a marketplace for outdoor advertising that works entirely online. Billboard owners and the scouts who sign them up put boards on a live map. Advertisers find a board anywhere in the world, book it or bid for it, upload their artwork, and get photo proof that it went up, without ever visiting the site. Greyboards holds the money until the proof arrives, takes a commission from the owner, and pays the scout who brought the board in.

The promise to an advertiser is **"book it, see it, pay only when it's up"**. Most of the features below exist to make that promise true for someone who will never stand in front of the board.

## 2. People and what they come for

One account can hold several roles. An agency can be an advertiser and an owner; a scout can also own a few boards.

| Role | Comes to | Pays or earns |
| --- | --- | --- |
| **Owner** | List boards, fill empty dates, approve artwork, get paid | Pays Greyboards a commission on each booking |
| **Scout** | Find boards in the field, sign owners to an exclusive agreement, tag the boards | Earns a commission on every booking of the boards they tagged |
| **Advertiser** | Find boards, book, bid or share, upload artwork, track the campaign | Pays for bookings |
| **Admin** | Verify tags and owners, review artwork, settle disputes, set commissions | |
| **Installer** (suggested, phase 2) | Print and put up artwork on static boards | Paid per job |

## 3. Refining the features you listed

### 3.1 Tagging (owners and scouts)

A **tag** is a board captured on the map. Both owners and scouts tag, but the evidence differs:

- **Owner tags their own board.** They capture it on site with the mobile app, or add it from the web and send a scout or installer later to confirm it.
- **Scout tags someone else's board.** The scout meets the owner in person, records the agreement in the app (see 3.2), then captures the board.

A capture is only accepted from the app's own camera, never the photo gallery, and records:

- live GPS position and its accuracy (the capture button stays disabled until accuracy is under about 15 m),
- compass heading, which gives the board's **facing direction** (which traffic sees it),
- time, device, and 3 or more photos (wide shot with surroundings, close shot, and the structure's ID plate or permit if there is one),
- board details: type (static, digital/LED, wall, gantry, transit), size, number of faces, lighting, and the road it faces.

**"Real-time location" means live GPS and compass during capture**, shown as a moving pin and an accuracy ring. It does not mean tracking scouts all the time; the app only reads location while the capture screen is open.

**A tag becomes a listing in three steps:** `captured` → `verified` (an admin, or an automatic check, confirms the photos, location and owner) → `listed` (the owner has set prices and dates). Only listed boards appear to advertisers.

**Duplicates.** Before saving, the app checks for tagged boards within about 30 m facing a similar direction and shows them. The first verified tag with a valid owner agreement wins; competing tags go to admin review.

### 3.2 Exclusive agreements (scouts)

The scout's physical meeting with the owner becomes a record in the app:

1. The scout enters the owner's name and phone number; the owner confirms with a one-time code sent to their phone, on the spot.
2. Both see the agreement: Greyboards' exclusive right to market the board for a term (for example 12 months), the commission the owner pays, and the payout account.
3. The owner signs on the scout's screen (or later from a link), and both get a copy.
4. The owner gets an invitation to claim their account, so they can manage the board themselves later. The board stays credited to the scout for the term.

### 3.3 Owners: rent and manage

- **Rate card per face:** price per week or month, minimum booking length, and for digital boards price per slot.
- **Availability calendar:** blocked dates, seasonal prices, and bookings already made.
- **Booking requests:** accept automatically or review each one. Every booking needs the owner's approval of the artwork.
- **Proof of posting:** after the artwork is up, the owner (or installer) uploads geotagged photos from the app. This releases the payment.
- **Earnings:** what each board earned, Greyboards' commission, and payouts to their bank account.

### 3.4 Advertisers: place, share and bid

**Placing (fixed price).** Pick a board on the map, pick dates, upload artwork, pay. The dates are held for 15 minutes during checkout so two people can't book the same face.

**Sharing.** Your description can mean two things; I suggest we support the first in phase 2 and the second from the start:

1. **Shared booking (co-op).** Several advertisers split one board's cost. On a digital board each gets a share of the loop (for example 2 of 6 ten-second slots). On a static board the period is split (for example weeks 1–2 and weeks 3–4). The organiser invites others by link, and each pays their own share; the booking only goes ahead once every share is paid, or the organiser covers the rest.
2. **Team sharing.** An agency's team members see and manage the same campaigns. This maps directly onto *Spaces and members* in toneflix/photos.

**Bids.** An owner can open a board's future period to bids instead of a fixed price:

- The owner sets a reserve price and a closing time. Bids are visible as the current highest amount, not who placed them.
- A bid in the last 5 minutes extends the closing time by 5 minutes so last-second bids can't snipe.
- The winner has 24 hours to pay. If they don't, the next highest bidder is offered the period.
- Suggested addition: **"make an offer"** on fixed-price boards, which the owner can accept, decline or counter.

### 3.5 Commissions

Example with a ₦1,000,000 booking, a 15% platform commission and a scout share of 30% of that commission:

| | Amount |
| --- | --- |
| Advertiser pays | ₦1,000,000 (held by Greyboards) |
| Greyboards' commission from the owner (15%) | ₦150,000 |
| Owner receives | ₦850,000 |
| Scout receives (30% of Greyboards' commission) | ₦45,000 |
| Greyboards keeps | ₦105,000 |

Paying the scout from Greyboards' share means owners pay one clear rate whether or not a scout brought them in. Commissions are paid only after proof of posting is accepted, and can be reversed within a short window if a booking is refunded.

All money moves through a ledger (escrow in, commission, scout share, owner payout), so every balance can be traced back to the booking that made it.

## 4. Suggested missing features

Ranked by how much the core promise depends on them.

1. **Proof of posting and escrow.** Without it an advertiser who never visits has no reason to trust a booking. Payment is held until geotagged photos of the artwork on the board are accepted, with periodic check-in photos for longer bookings. Digital boards add play logs.
2. **Artwork checks and approval.** Check the file against the board's size and resolution, let the owner approve, and run a content-policy review. Some places also need a signage authority's approval; the booking should show who is responsible for that.
3. **Printing and installation.** Static boards need vinyl printed and put up. Either the owner quotes print-and-install as an add-on, or Greyboards lists local installers who take jobs (installer role). This is the most common gap in the current idea.
4. **Verification and fraud checks.** Phone and ID verification for owners and scouts, in-app camera only, GPS accuracy limits, duplicate detection, and admin review of first tags from new scouts.
5. **Scout pipeline.** Prospects → contacted → signed → captured → verified → earning, so scouts can work a street systematically, plus territories so two scouts don't chase the same owner.
6. **Map search that fits how buyers think.** Clustering, filters (type, size, price, lit, digital, available dates), search by radius, by area drawn on the map, and along a route. Saved searches with alerts when a matching board frees up.
7. **Board page that replaces the site visit.** Photos, street-level view, facing direction on a mini map, nearby points of interest, and an estimate of daily traffic where data exists.
8. **Messages.** Advertiser, owner and installer chat about a booking inside the app, so agreements and evidence stay with the booking.
9. **Cancellations, refunds and disputes.** Clear policy per booking type, a dispute flow attached to the booking, and admin decisions recorded in the ledger.
10. **Reviews.** Advertisers rate boards and owners after a campaign; owners rate advertisers.
11. **Campaign report.** A shareable page and PDF with the proof photos, dates and boards, for advertisers to show their own clients.
12. **Owner bulk tools.** Import many boards from a spreadsheet, apply price rules to several boards at once.
13. **Multi-currency and payouts by region.** Prices shown in the buyer's currency, owners paid in theirs. The payment regions in toneflix/photos already handle this.
14. **Digital board scheduling** (phase 3). Time-of-day slots and integrations with screen players for live play logs.

## 5. Phases

| Phase | Scope |
| --- | --- |
| **1. Core marketplace** | Accounts and roles, tagging with live GPS and compass (mobile), scout agreements, verification queue, listings and rate cards, map search, fixed-price booking with date holds, artwork upload and owner approval, escrow payments, proof of posting, commission ledger and payouts, admin moderation |
| **2. Market mechanics** | Bids and offers, shared bookings, installer marketplace, messages, reviews, disputes, campaign reports, scout pipeline and territories |
| **3. Scale** | Digital slot scheduling and play logs, traffic estimates and price guidance, owner bulk tools, public API for agencies |

## 6. How it maps onto the toneflix/photos stack

Same layout and tools as toneflix/photos: a pnpm monorepo with Node 24 and PostgreSQL 16.

| Path | What it is | Notes for Greyboards |
| --- | --- | --- |
| `apps/api` | Arkstack (Express driver), PostgreSQL | Add the **PostGIS** extension for map queries (boards within a radius, inside a drawn area, along a route) |
| `apps/web` | React Router with SSR on Cloudflare Workers, Tailwind 4 | Advertiser and owner web app, admin dashboard |
| `apps/mobile` | Expo with Expo Router | Main tool for scouts and owners in the field: `expo-location` (GPS), `expo-sensors` (compass), `expo-camera` (in-app capture) |
| `packages/types` | `@greyboards/types` | Shared domain and API types |
| `packages/api-client` | `@greyboards/api-client` on alova | Typed endpoints used by web and mobile |

**Reused as they are in toneflix/photos:** sign-in, sessions and devices, two-step sign-in, roles and the `Permission` list, plans and payment regions, the `PaymentGateway` interface with Flutterwave, `Checkout`, settings, documents (terms, privacy), notifications, the filesystem module with S3 or R2 and signed URLs, the queue and scheduler, the `Moderation` service, and the deploy setup (Railway or SSH for the API, Cloudflare for web, EAS for Android).

**New domain pieces (first draft):**

- `boards`, `board_faces` (the rentable unit), `board_captures` (each tag's GPS, heading, accuracy, photos and device)
- `owner_agreements` (scout, owner, term, signature, status)
- `rate_cards`, `availability_blocks`
- `bookings` with a date range per face, guarded by a PostgreSQL exclusion constraint so two bookings can never overlap
- `booking_shares` (co-op participants), `auctions`, `bids`, `offers`
- `creatives`, `creative_reviews`, `proofs`
- `ledger_entries`, `payouts`, `disputes`, `reviews`, `messages`

Commission rates belong to one authority (a `Commissions` policy read from settings and region), not repeated in controllers or jobs. Map and list endpoints are always paginated or bounded by the visible map area.

**Map provider.** I suggest MapLibre (`maplibre-gl` on web, `@maplibre/maplibre-react-native` on mobile) with vector tiles from a hosted provider, which keeps costs predictable and avoids lock-in. Google Maps is the alternative if street-level imagery on the board page matters more.

**Live updates** (bids, a board's dates being taken while someone looks at it) can start with polling and move to server-sent events or Cloudflare Durable Objects once bids are built.

## 7. Questions to decide

1. **Scout commission:** a share of Greyboards' commission (as in 3.5) or an extra charge on the owner? For how long: the agreement's term, or for as long as the board stays listed?
2. **Sharing:** is the shared booking (co-op) in 3.4 what you meant, or something else?
3. **Bids:** may only owners open a period for bids, or can advertisers request an auction? Is the open highest-bid format right, or do you want sealed bids?
4. **Printing and installation:** owner's job, installers on the platform, or both?
5. **Launch market:** "anywhere in the world" is the goal, but payments, permits and the first scouts need a starting country or city. Lagos?
6. **Map provider:** MapLibre with hosted tiles, or Google Maps?

## 8. Design

### Colours

Taken from the Greysoft logo (three grey circles and one wine circle). The scales are written the way `apps/web/app/app.css` in toneflix/photos writes its theme.

| Token | Hex | Use |
| --- | --- | --- |
| `brand-500` | `#833b4b` | Logo wine. Primary buttons, selected pins, links |
| `brand-50` / `100` / `200` / `300` / `400` | `#f8eef1` `#efd6dd` `#dcaab7` `#c27b8e` `#a4566a` | Tints for selected rows, badges, map halos |
| `brand-600` / `700` / `800` | `#6e3040` `#582634` `#421c27` | Hover, pressed, text on tints |
| `ink-500` | `#727376` | Logo grey. Secondary text, icons |
| `ink-700` / `ink-900` | `#46474b` `#1e1f22` | Body text, headings |
| `canvas` | `#f4f4f5` | Page background |
| `surface-50` / `100` / `200` / `300` | `#ffffff` `#ececee` `#dcdcdf` `#c4c5c9` | Cards, fills, borders |

Status colours stay apart from the wine so a booked or warning state is never mistaken for a brand action: available `#1f7a4d`, held `#b26a00`, booked `#46474b`.

### Screens and flows

A clickable prototype of the main screens and the three flows (owner, scout, advertiser) is shared separately for review. The design follows toneflix/photos' patterns: white surfaces on a tinted page, Inter and Plus Jakarta Sans, and a map-first layout for advertisers.
