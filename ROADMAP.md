# Roadmap

What's built and what's left, following the phases in [docs/proposal.md](docs/proposal.md). Business numbers are admin settings, so open questions about them don't block the work: each ships with a placeholder that can be changed later.

## Phase 1: Core marketplace

- [x] Accounts, marketplace roles and partner review (#2)
- [x] Mobile app shell (#3)
- [x] Boards with GPS, photos and PostGIS search (#5)
- [x] Owner profiles and owner agreements by SMS (#6)
- [x] Map search for advertisers on MapLibre (#7)
- [x] Fixed-price booking with date holds and escrow payments (#8)
- [x] Artwork approval and the billposter print job marketplace (#9)
- [x] Proof of posting that releases escrow, with the commission ledger (#10)
- [x] Tagging boards from the phone (#11)
- [x] Compass heading when tagging a board
- [x] Owners (or their scouts) printing and putting up the ad themselves
- [x] Missed print deadlines: the job goes back with a higher fee, repeat misses suspend the billposter, and the scout is warned when nobody has taken a job close to go-live
- [x] Bank details and real payouts to owners, scouts and billposters
- [x] Refunds and cancellations of paid bookings
- [x] Rate cards per board face, and owners blocking dates
- [x] ID and bank checks for scouts and billposters, and duplicate board detection
- [x] Billposter jobs and proof photos in the mobile app

## Phase 2: Market mechanics

- [x] Bids and offers
- [x] Shared (co-op) bookings
- [x] Messages about a booking
- [ ] Reviews
- [ ] Disputes
- [ ] Campaign reports
- [ ] Scout pipeline and territories

## Phase 3: Scale

- [ ] Digital slot scheduling and play logs
- [ ] Traffic estimates and price guidance
- [ ] Owner bulk import and price rules
- [ ] Public API for agencies

## Open decisions

- The EAS project for mobile builds
- Default owner share (70%) and the owner agreement wording
- Scout pay on managed boards, what "sharing" means, the bid format and the launch city (proposal questions 1, 2, 3 and 5)

## Needed before launch

Flutterwave live keys, an SMS provider (Africa's Talking or Twilio), a map tile style URL, S3 or R2 storage, mail, Postgres with PostGIS, and the Cloudflare and Railway deploy setup.
