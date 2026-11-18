# Greyboards: product proposal

Status: draft for discussion. Nothing here is built yet. Percentages and prices are examples to react to, not decisions.

## 1. The idea in one paragraph

Greyboards is a marketplace for outdoor advertising that works entirely online. Scouts find billboards in the field, sign their owners to an exclusive agreement and put the boards on a live map. Most owners never touch the app: the scout manages the board for them, and they get texts and bank transfers. Advertisers find a board anywhere in the world, book it or bid for it, upload their artwork, and get photo proof that it went up, without ever visiting the site. Greyboards holds the money until the proof arrives, takes a commission from the owner, and pays the scout who brought the board in.

The promise to an advertiser is **"book it, see it, pay only when it's up"**. Most of the features below exist to make that promise true for someone who will never stand in front of the board.

## 2. People and what they come for

One account can hold several roles. An agency can be an advertiser and an owner; a scout can also own a few boards.

| Role | Comes to | Pays or earns |
| --- | --- | --- |
| **Owner (managed)**, most owners | Nothing: they never sign in. They sign an agreement with a scout, get a text when their board is booked, and get paid by bank transfer | Pays Greyboards a commission on each booking |
| **Owner (self-serve)**, larger media companies | List boards, set rates, approve artwork, upload proof and see earnings themselves | Pays Greyboards a commission on each booking |
| **Scout** | Find boards, sign owners, tag the boards, and run them for managed owners: rates, artwork checks, installation and proof photos | Earns a commission on every booking of the boards they signed |
| **Advertiser** | Find boards, book, bid or share, upload artwork, track the campaign | Pays for bookings |
| **Admin** | Verify tags and owners, review artwork, settle disputes, set commissions | |
| **Dispatcher** (working name) | Find booked boards nearby that need printing, reserve the job, print the artwork and put it up | Paid per job, after proof |

## 3. Refining the features you listed

### 3.1 Tagging (owners and scouts)

A **tag** is a board captured on the map. Scouts do almost all tagging:

- **Scout tags someone else's board.** The scout meets the owner in person, records the agreement in the app (see 3.2), then captures the board. This is the normal path.
- **A self-serve owner tags their own board.** They capture it on site with the mobile app, or add it from the web and a scout confirms it later.

A capture is only accepted from the app's own camera, never the photo gallery, and records:

- live GPS position and its accuracy (the capture button stays disabled until accuracy is under about 15 m),
- compass heading, which gives the board's **facing direction** (which traffic sees it),
- time, device, and 3 or more photos (wide shot with surroundings, close shot, and the structure's ID plate or permit if there is one),
- board details: type (static, digital/LED, wall, gantry, transit), size, number of faces, lighting, and the road it faces.

**"Real-time location" means live GPS and compass during capture**, shown as a moving pin and an accuracy ring. It does not mean tracking scouts all the time; the app only reads location while the capture screen is open.

**A tag becomes a listing in three steps:** `captured` → `verified` (an admin, or an automatic check, confirms the photos, location and owner) → `listed` (prices and dates are set, by the scout for a managed owner, or by a self-serve owner). Only listed boards appear to advertisers.

**Duplicates.** Before saving, the app checks for tagged boards within about 30 m facing a similar direction and shows them. The first verified tag with a valid owner agreement wins; competing tags go to admin review.

### 3.2 Exclusive agreements (scouts)

The scout's physical meeting with the owner becomes a record in the scout's app. The owner needs only a phone that can receive texts, not a smartphone or an account:

1. The scout enters the owner's name and phone number. Greyboards texts the owner a code, which they read out to the scout, so we know the number is real and theirs.
2. The scout records the owner's bank account for payouts. Greyboards checks the account name matches the owner before the first payout.
3. The scout goes through the agreement with the owner: Greyboards' exclusive right to market the board for a term (for example 12 months), the commission, the owner's minimum price, and **who approves ads**. By default the owner hands ad approval to the scout within simple rules (for example no political or alcohol ads), and can ask to be called about each one instead.
4. The owner signs on the scout's screen. A photo of a signed paper copy and of the owner's ID are attached too, since a screen signature alone may not be enough if there's a dispute.
5. The owner gets a text with a link to the agreement. They can create an account later if they want to manage the board themselves; until then, and for the term, the board is run by the scout.

### 3.3 Owners: rent and manage

**Managed owners (no app).** The scout runs the board on their behalf, and the owner hears about it by text (SMS, or WhatsApp where we can):

- "Your board on Lekki–Epe is booked for December for ₦1,200,000. You'll receive ₦1,020,000 after the ad is up."
- "Payment of ₦1,020,000 sent to GTBank ••4821."

They can reply or call Greyboards support, and can ask the scout to block dates they use for their own clients. The scout sets rates within the owner's minimum, checks artwork against the agreed rules, makes sure the artwork gets printed and put up (by the owner or a dispatcher), and uploads proof photos if nobody else does. Owners are paid by bank transfer whether or not they ever sign in.

**Self-serve owners (web and app).** Larger owners with many boards manage everything themselves:

### 3.3 Owners: rent and manage

- **Rate card per face:** price per week or month, minimum booking length, and for digital boards price per slot.
- **Availability calendar:** blocked dates, seasonal prices, and bookings already made.
- **Booking requests:** accept automatically or review each one. Every booking needs the owner's approval of the artwork.
- **Proof of posting:** after the artwork is up, whoever put the artwork up (owner, dispatcher or scout) uploads geotagged photos from the app. This releases the payment.
- **Earnings:** what each board earned, Greyboards' commission, and payouts to their bank account.

### 3.4 Advertisers: place, share and bid

**Placing (fixed price).** Pick a board on the map, pick dates, upload artwork, pay. The dates are held for 15 minutes during checkout so two people can't book the same face.

**Sharing.** Your description can mean two things; I suggest we support the first in phase 2 and the second from the start:

1. **Shared booking (co-op).** Several advertisers split one board's cost. On a digital board each gets a share of the loop (for example 2 of 6 ten-second slots). On a static board the period is split (for example weeks 1–2 and weeks 3–4). The organiser invites others by link, and each pays their own share; the booking only goes ahead once every share is paid, or the organiser covers the rest.
2. **Team sharing.** An agency's team members see and manage the same campaigns. This maps directly onto *Spaces and members* in toneflix/photos.

**Bids.** A board's future period can be opened to bids instead of a fixed price (by a self-serve owner, or by the scout for a managed owner):

- The reserve price is at least the owner's minimum. The owner or scout sets it and a closing time and a closing time. Bids are visible as the current highest amount, not who placed them.
- A bid in the last 5 minutes extends the closing time by 5 minutes so last-second bids can't snipe.
- The winner has 24 hours to pay. If they don't, the next highest bidder is offered the period.
- Suggested addition: **"make an offer"** on fixed-price boards, which the owner or their scout can accept, decline or counter.

### 3.5 Printing and display

Static boards need the artwork printed and put up. Two ways, chosen per board and shown to the advertiser at booking:

1. **The owner prints.** The owner (or their scout) offers print-and-display at a price on the board's rate card, and takes the job automatically when the booking is made.
2. **A dispatcher prints.** The job goes to a marketplace of local dispatchers. This is the default when the owner doesn't print.

**Why "dispatch".** The person prints *and* displays, so "Printer" is too narrow. Dispatcher is the trade's own word for someone who puts up posters and billboards, and "posting" is what the industry calls putting an ad on a board, which matches *proof of posting*. Alternatives if you prefer: **Poster crew**, **Fixer**, or **Fulfiller**.

**The dispatcher's flow:**

1. **Find jobs near me.** A map and list of booked boards within their chosen radius that need printing, with the size, material, go-live date and pay.
2. **Reserve.** Tapping *Reserve* holds the job for them alone for a short window (for example 2 hours) while they confirm they can deliver by the deadline. Once confirmed, the job is theirs; other dispatchers no longer see it.
3. **Print.** They download the print-ready artwork (only after reserving) and print it. The app asks for a photo of the finished print before they go to the site, so a wrong print is caught early.
4. **Display.** On site, they put it up and capture proof in the app, with the same GPS and in-app camera rules as tagging.
5. **Get paid.** The print-and-display fee is held from the advertiser's payment and released to them when the proof is accepted.

**Keeping it reliable:** a dispatcher who misses a deadline loses the job, which goes back to the marketplace with a higher fee if the go-live date is close; repeated misses suspend them. Dispatchers are verified like scouts (phone, ID, bank account) and rated by advertisers. The scout for a managed board is told when a job has no taker 3 days before go-live, so they can step in.

**Pricing.** A fixed rate per square metre and material, set by Greyboards per region, keeps it simple for phase 1. Dispatchers bidding for jobs can come later if fixed rates don't attract enough of them.

One person can be a dispatcher and a scout, or an owner, on the same account.

### 3.6 Commissions

The rent is split between the owner, Greyboards and the scout who brought the board in: 70%, 20% and 10% by default. Printing and posting is separate: the advertiser pays the dispatcher's price on top of the rent, and it goes to the dispatcher who did it, so it never comes out of anyone's share. Admins can change the three parts, and they must always add up to 100%. On a board its owner tagged, with no scout, the scout's part goes to the owner by default (an admin setting can send it to Greyboards instead).

Example with ₦1,000,000 of rent on a scouted board, and a dispatcher's price of ₦100,000:

| | Amount |
| --- | --- |
| Advertiser pays | ₦1,100,000 (held by Greyboards): ₦1,000,000 rent and ₦100,000 printing |
| Dispatcher, for printing and posting | ₦100,000 |
| Owner receives (70% of the rent) | ₦700,000 |
| Greyboards keeps (20%) | ₦200,000 |
| Scout receives (10%) | ₦100,000 |

Whoever tags a board can instead fix what the owner receives. The rate they enter is then the owner's amount, and the board is listed with the other shares added on top: an owner's ₦100,000 on a scouted board lists at ₦142,858 (₦100,000 ÷ 70%, rounded up to a naira). The owner is never paid less than their amount, even when a lower bid or offer is accepted; the difference comes out of the Greyboards and scout shares.

Shares are paid only after proof of posting is accepted. A signed agreement keeps the owner's share it was signed at, and a paid booking keeps the split it was paid with.

All money moves through a ledger (escrow in, commission, scout share, owner payout), so every balance can be traced back to the booking that made it.

## 4. Suggested missing features

Ranked by how much the core promise depends on them.

1. **Proof of posting and escrow.** Without it an advertiser who never visits has no reason to trust a booking. Payment is held until geotagged photos of the artwork on the board are accepted, with periodic check-in photos for longer bookings. Digital boards add play logs.
2. **Artwork checks and approval.** Check the file against the board's size and resolution, let the owner approve, and run a content-policy review. Some places also need a signage authority's approval; the booking should show who is responsible for that.
3. **Printing and display.** Covered in 3.5: owners who print, and a dispatcher marketplace for everyone else.
4. **Verification and fraud checks.** Phone and ID verification for owners and scouts, in-app camera only, GPS accuracy limits, duplicate detection, and admin review of first tags from new scouts.
5. **Scout pipeline and tasks.** Prospects → contacted → signed → captured → verified → earning, so scouts can work a street systematically, plus territories so two scouts don't chase the same owner, and a task list for managed boards (artwork to check, installs to arrange, proof photos due).
6. **Map search that fits how buyers think.** Clustering, filters (type, size, price, lit, digital, available dates), search by radius, by area drawn on the map, and along a route. Saved searches with alerts when a matching board frees up.
7. **Board page that replaces the site visit.** Photos, street-level view, facing direction on a mini map, nearby points of interest, and an estimate of daily traffic where data exists.
8. **Messages and texts.** Advertiser, scout, owner and dispatcher chat about a booking inside the app, so agreements and evidence stay with the booking. Managed owners get the same updates by SMS or WhatsApp.
9. **Cancellations, refunds and disputes.** Clear policy per booking type, a dispute flow attached to the booking, and admin decisions recorded in the ledger.
10. **Reviews.** Advertisers rate boards and owners after a campaign; owners rate advertisers.
11. **Campaign report.** A shareable page and PDF with the proof photos, dates and boards, for advertisers to show their own clients.
12. **Owner bulk tools.** Import many boards from a spreadsheet, apply price rules to several boards at once.
13. **Multi-currency and payouts by region.** Prices shown in the buyer's currency, owners paid in theirs. The payment regions in toneflix/photos already handle this.
14. **Digital board scheduling** (phase 3). Time-of-day slots and integrations with screen players for live play logs. Built: a screen's loop is sold by the slot, all day or for the morning (6 AM to noon), afternoon (noon to 6 PM) or evening (6 PM to midnight), each priced as an admin-set share of the all-day rate. The screen's player signs in with a token from the board's page, fetches each day's schedule and reports plays, which advertisers see on their booking.

## 5. Phases

| Phase | Scope |
| --- | --- |
| **1. Core marketplace** | Accounts and roles, tagging with live GPS and compass (mobile), scout agreements for owners without accounts, verification queue, listings and rate cards, map search, fixed-price booking with date holds, artwork upload and approval (by the scout for managed owners), SMS updates to owners, owner printing and the dispatcher job marketplace at fixed rates, escrow payments, proof of posting, commission ledger and payouts, admin moderation |
| **2. Market mechanics** | Bids and offers, shared bookings, messages, reviews, disputes, campaign reports, scout pipeline and territories |
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
- `owners` (name, verified phone, bank account; linked to a user only if they ever sign up), `owner_agreements` (scout, owner, term, minimum price, ad rules, signature, paper copy, status)
- `scout_tasks` (artwork checks, installs and proof visits for managed boards)
- `print_jobs` (booking, size, material, fee, deadline, who prints), `print_job_reservations` (dispatcher, hold expiry, confirmed at)
- `rate_cards`, `availability_blocks`
- `bookings` with a date range per face, guarded by a PostgreSQL exclusion constraint so two bookings can never overlap
- `booking_shares` (co-op participants), `auctions`, `bids`, `offers`
- `creatives`, `creative_reviews`, `proofs`
- `ledger_entries`, `payouts`, `disputes`, `reviews`, `messages`

Commission rates belong to one authority (a `Commissions` policy read from settings and region), not repeated in controllers or jobs. Map and list endpoints are always paginated or bounded by the visible map area.

**Map provider.** I suggest MapLibre (`maplibre-gl` on web, `@maplibre/maplibre-react-native` on mobile) with vector tiles from a hosted provider, which keeps costs predictable and avoids lock-in. Google Maps is the alternative if street-level imagery on the board page matters more.

**Live updates** (bids, a board's dates being taken while someone looks at it) can start with polling and move to server-sent events or Cloudflare Durable Objects once bids are built.

## 7. Questions to decide

1. **Scout commission:** now that scouts run boards for managed owners, should they earn more on those than on self-serve boards, or get a fee per proof visit? Separately: a share of Greyboards' commission (as in 3.6) or an extra charge on the owner? For how long: the agreement's term, or for as long as the board stays listed?
2. **Sharing:** is the shared booking (co-op) in 3.4 what you meant, or something else?
3. **Bids:** may only owners open a period for bids, or can advertisers request an auction? Is the open highest-bid format right, or do you want sealed bids?
4. **Print-and-display role name:** decided: Dispatch.
5. **Launch market:** decided: Kaduna goes live first.
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
