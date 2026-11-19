# Greyboards API

The Greyboards REST API, built on [Arkstack](https://arkstack.toneflix.net/) with the Express driver, arkormx models and Postgres with PostGIS.

## Developing

```sh
cp .env.example .env
pnpm exec ark key:generate
pnpm exec ark migrate
pnpm exec ark seed
pnpm dev
```

The first migration enables the `postgis` extension, so the database user needs permission to create extensions (or PostGIS must already be enabled).

## Managing accounts

- `ark users:list` pages through accounts (`--search` filters by name, email or username) and opens the one you pick to edit, verify, suspend, delete or change its staff role.
- `ark users:role you@example.com admin` sets an account's staff role.

## Marketplace roles

`AccountRole` holds the roles a person works in: advertiser, owner, scout and dispatcher. Advertiser and owner are active as soon as they are taken. Scout and dispatcher start as pending and are approved, rejected or suspended from `PATCH /api/admin/account-roles/:id` by someone with the `partners.review` permission. The person gets an email with the outcome.

Routes that only one role may use take `Authorize.actingAs('scout')` and similar, next to `Authorize.to(...permissions)` for staff permissions.

## Mock data

`ark db:mock` fills an empty database with demo data for local work, QA and staging demos. It runs the standard pages too, so it can follow straight after migrating:

```sh
pnpm exec ark migrate:fresh
pnpm exec ark db:mock
```

It refuses to run when `APP_ENV` is `production`, or when the database already has the mock data. It is separate from `ark seed`, and `ark seed --all` never picks it up. Images are drawn and saved to the uploads disk like real uploads.

What it adds:

- Staff, and people in every marketplace role, including pending and rejected applications with their ID checks.
- 22 boards in Kaduna, Abuja, Lagos, Accra, Nairobi, London and Houston, including digital screens with slots, boards scouts run for offline owners, a board waiting for review, a rejected one and one whose owner hasn't signed yet.
- Payment regions for Ghana, East Africa, the UK and the US, so boards outside Nigeria price in GHS, KES, GBP and USD.
- Bookings in every state, from a checkout on hold to completed campaigns, plus shared boards, offers, an open auction and a sold one.
- Print jobs with dispatchers' prices, proof of posting, a disputed proof, released escrow, paid payouts and one that bounced.
- Reputation earned through the usual rules, with Verified and Proven badges, plus scout territories, prospects, reviews, messages and a campaign report.

Every account signs in with the password `greyboards-demo`. All addresses use `example.com` and all phone numbers are made up.

| Account | Email | What to look at |
| --- | --- | --- |
| Admin | `admin@example.com` | Everything under Admin |
| Reviewer | `reviewer@example.com` | Applications, board reviews, reputation |
| Advertiser | `advertiser@example.com` | Amina Yusuf: live, upcoming, shared and completed bookings, a sold bid, a campaign report |
| Owner | `owner@example.com` | Ibrahim Danjuma: own boards in Kaduna, a digital screen, payouts; also an advertiser |
| Scout | `scout@example.com` | Usman Abdullahi: Kaduna boards he runs, prospects, territory, a bounced payout |
| Dispatch | `dispatch@example.com` | Yakubu Garba: open, confirmed and posted print jobs; Verified and Proven |

More accounts, all with the same password:

| Name | Email | Role |
| --- | --- | --- |
| Tunde Bakare | `tunde.bakare@example.com` | Advertiser |
| Chidi Okafor | `chidi.okafor@example.com` | Advertiser |
| Grace Mensah | `grace.mensah@example.com` | Advertiser (Ghana) |
| Wanjiru Kamau | `wanjiru.kamau@example.com` | Advertiser (Kenya), with an open dispute |
| Oliver Hughes | `oliver.hughes@example.com` | Advertiser (UK) |
| Femi Adeyemi | `femi.adeyemi@example.com` | Owner, Abuja and Lagos |
| Kwame Asante | `kwame.asante@example.com` | Owner, Accra |
| Sarah Whitfield | `sarah.whitfield@example.com` | Owner, London |
| Marcus Reed | `marcus.reed@example.com` | Owner, Houston |
| Halima Sani | `halima.sani@example.com` | Scout, Kaduna South |
| Brian Otieno | `brian.otieno@example.com` | Scout, Nairobi |
| Joseph Akpan | `joseph.akpan@example.com` | Scout, waiting for review |
| Esther Nnamdi | `esther.nnamdi@example.com` | Dispatch, with a missed job |
| Kofi Boateng | `kofi.boateng@example.com` | Dispatch, Accra |
| Aisha Mohammed | `aisha.mohammed@example.com` | Dispatch, waiting for review |
| Daniel Price | `daniel.price@example.com` | Dispatch, rejected |

Dates are relative to the day it runs, so the data always looks current. The content lives in `src/database/mock/content`.

## Tests

```sh
pnpm test
```

Tests need a Postgres database with PostGIS, set by `DATABASE_URL` in `.env` (or the environment).
