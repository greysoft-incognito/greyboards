# Roadmap

What's built and what's left, following the phases in [docs/proposal.md](docs/proposal.md). Business numbers are admin settings, so open questions about them don't block the work: each ships with a placeholder that can be changed later.

## Phase 1: Core marketplace

- [x] Accounts, marketplace roles and partner review (#2)
- [x] Mobile app shell (#3)
- [x] Boards with GPS, photos and PostGIS search (#5)
- [x] Owner profiles and owner agreements by SMS (#6)
- [x] Map search for advertisers on MapLibre (#7)
- [x] Fixed-price booking with date holds and escrow payments (#8)
- [x] Artwork approval and the dispatcher print job marketplace (#9)
- [x] Proof of posting that releases escrow, with the commission ledger (#10)
- [x] Tagging boards from the phone (#11)
- [x] Compass heading when tagging a board
- [x] Owners (or their scouts) printing and putting up the ad themselves
- [x] Missed print deadlines: the job goes back with a higher fee, repeat misses suspend the dispatcher, and the scout is warned when nobody has taken a job close to go-live
- [x] Bank details and real payouts to owners, scouts and dispatchers
- [x] Refunds and cancellations of paid bookings
- [x] Rate cards per board face, and owners blocking dates
- [x] ID and bank checks for scouts and dispatchers, and duplicate board detection
- [x] Dispatcher jobs and proof photos in the mobile app

## Phase 2: Market mechanics

- [x] Bids and offers
- [x] Shared (co-op) bookings
- [x] Messages about a booking
- [x] Reviews
- [x] Disputes
- [x] Campaign reports
- [x] Scout pipeline and territories

## Phase 3: Scale

- [x] Digital slot scheduling and play logs
- [x] Traffic estimates and price guidance
- [x] Owner bulk import and price rules
- [x] Public API for agencies

## Open decisions

- **Scout pay on managed boards** (proposal question 1): scouts earn the same share on every board they run, for as long as they're its scout. Still open: whether boards they manage for an owner earn more, or a fee per proof visit.

## Decided

- **Audience:** billboards anywhere in the world. Kaduna is the first launch city.
- **Revenue split:** owner 70, Greyboards 20, scout 10 of the rent, set by admins and always adding up to 100. The dispatcher's price is paid on top of the rent (#32, #37).
- **Owner net amount:** the tagger can fix what the owner receives, and the listed rent is grossed up to cover it (#39).
- **Dispatch:** "Billposter" is now Dispatch. Dispatchers set their own prices, and advertisers pick a bid or send a direct request (#33, #35).
- **Sharing:** several advertisers pay for one board for the same period, and the print merges every design. After an admin-set lock, an unfilled board goes to auction (#26, #35).
- **Bids:** whoever looks after a board opens its dates to bids, and advertisers can make offers below the price. Open or sealed bidding is an admin setting (#25).
- **Owner agreement wording:** the headline, share line, terms and SMS are admin settings (#38).
- **Map provider:** MapLibre.
- **Currency:** @toneflix/money, with an admin default currency and payment regions (#65).
- **Logo:** the G Monogram (#59).
- **Reputation:** admins give the Verified badge, and the Proven badge is earned at milestones (#45).
- **Deploys:** the API through GitHub Actions, and the web app through Cloudflare's Git builds from the wrangler config.
- **Mobile releases:** only a published GitHub release ships. It's built on the runner with our own keystore, sent to Google Play, and the APK goes to EAS. The release workflow creates or finds the EAS project itself.

## Needed before launch

Flutterwave live keys, an SMS provider (Africa's Talking or Twilio), a map tile style URL, S3 or R2 storage, mail, Postgres with PostGIS, the Cloudflare and Railway deploy setup, and an `EXPO_TOKEN` secret for EAS uploads.
