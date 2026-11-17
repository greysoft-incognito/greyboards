# greyboards
Greyboards (billboard-as-a-service) is a marketplace for outdoor advertising that works entirely online. Scouts find billboards in the field, sign their owners to an exclusive agreement and put the boards on a live map. Most owners never touch the app: the scout manages the board for them, and they get texts and bank transfers. Advertisers find a board anywhere in the world, book it or bid for it, upload their artwork, and get photo proof that it went up, without ever visiting the site. Greyboards holds the money until the proof arrives, takes a commission from the owner, and pays the scout who brought the board in.

The promise to an advertiser is "book it, see it, pay only when it's up". Most of the features below exist to make that promise true for someone who will never stand in front of the board.

The product plan lives in [docs/proposal.md](docs/proposal.md).

## Repository

A pnpm workspace:

| Path | What it is |
| --- | --- |
| `apps/api` | REST API on Arkstack (Express), Postgres with PostGIS |
| `apps/web` | Web app on React Router (SSR on Cloudflare Workers) and Tailwind 4, with Lucide icons |
| `packages/types` | Shared TypeScript types for the API's responses |
| `packages/api-client` | Typed client for the API, built on alova |

## Roles

Every account can work in one or more marketplace roles, taken from **Settings → Roles**:

- **Advertiser**: finds and books boards. Active straight away.
- **Board owner**: lists their own boards. Active straight away.
- **Scout**: signs owners and manages boards for them. Reviewed by the team first.
- **Billposter**: prints booked artwork and puts it up. Reviewed by the team first.

Reviews happen in the admin dashboard under **Applications**, by anyone holding the `partners.review` permission. These roles are separate from the staff roles (`user`, `admin`, `reviewer`) that control the dashboard.

## Getting started

You need Node 22 or newer, pnpm 10 and Postgres 16 with PostGIS. `docker compose up -d` starts a PostGIS database that matches `apps/api/.env.example`.

```sh
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm ark key:generate
pnpm ark migrate
pnpm ark seed
pnpm dev:api   # http://localhost:3000
pnpm dev:web   # http://localhost:5173
```

Make yourself an admin with `pnpm ark users:role you@example.com admin`.

## Checks

```sh
pnpm typecheck
pnpm test
pnpm build
```
