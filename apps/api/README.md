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

## Tests

```sh
pnpm test
```

Tests need a Postgres database with PostGIS, set by `DATABASE_URL` in `.env` (or the environment).
