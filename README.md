# greyboards
Greyboards (billboard-as-a-service) is a marketplace for outdoor advertising that works entirely online. Scouts find billboards in the field, sign their owners to an exclusive agreement and put the boards on a live map. Most owners never touch the app: the scout manages the board for them, and they get texts and bank transfers. Advertisers find a board anywhere in the world, book it or bid for it, upload their artwork, and get photo proof that it went up, without ever visiting the site. Greyboards holds the money until the proof arrives, takes a commission from the owner, and pays the scout who brought the board in.

The promise to an advertiser is "book it, see it, pay only when it's up". Most of the features below exist to make that promise true for someone who will never stand in front of the board.

The product plan lives in [docs/proposal.md](docs/proposal.md), and what is built and left is in [ROADMAP.md](ROADMAP.md).

## Repository

A pnpm workspace:

| Path | What it is |
| --- | --- |
| `apps/api` | REST API on Arkstack (Express), Postgres with PostGIS |
| `apps/web` | Web app on React Router (SSR on Cloudflare Workers) and Tailwind 4, with Lucide icons |
| `apps/mobile` | Android and iOS app on Expo Router, with Lucide icons |
| `packages/types` | Shared TypeScript types for the API's responses |
| `packages/api-client` | Typed client for the API, built on alova |

## Roles

Every account can work in one or more marketplace roles, taken from **Settings → Roles**:

- **Advertiser**: finds and books boards. Active straight away.
- **Board owner**: lists their own boards. Active straight away.
- **Scout**: signs owners and manages boards for them. Reviewed by the team first.
- **Dispatcher**: prints booked artwork and puts it up. Reviewed by the team first.

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
pnpm dev:mobile  # Expo; set EXPO_PUBLIC_API_URL in apps/mobile/.env
```

Make yourself an admin with `pnpm ark users:role you@example.com admin`.

## Checks

```sh
pnpm typecheck
pnpm test
pnpm build
```

## Web deploys (Cloudflare Workers)

Cloudflare builds and deploys `apps/web` from GitHub. In the Cloudflare dashboard, Workers & Pages → Create → Import a repository, pick this repository, and set:

- Root directory: `apps/web`
- Build command: `CLOUDFLARE_ENV=production pnpm run build`
- Deploy command: `npx wrangler deploy`

Then, under the `greyboards-web` Worker's Settings → Variables and secrets, add `API_URL` (the public API address, such as `https://api.example.com/api`) and, optionally, `MAP_STYLE_URL`. The production build leaves out the local defaults in `wrangler.jsonc` and keeps the dashboard values on every deploy.

## Mobile builds (EAS)

The Android app builds on [EAS](https://expo.dev/eas) from the **Deploy apps** workflow: a push to the `deploy` branch, or a manual run from the Actions tab. The bundle id is `com.greysoft.greyboards.app` on both iOS and Android.

One-time setup, in GitHub → Settings → Secrets and variables → Actions:

- secret `EXPO_TOKEN`: an access token from expo.dev → Account settings → Access tokens, made by the Expo account that will own the app
- variable `EAS_OWNER`: that Expo account or organisation name
- variable `API_URL`: the public API address, such as `https://api.example.com/api`
- variable `WEB_URL` (optional): the web app's https address, so email links open the app

The first run creates the EAS project for the app (or finds it, if the account already has one called `greyboards`) and prints its id. Save that id as the variable `EAS_PROJECT_ID` to skip the lookup on later runs.

For Google Play, upload the first App Bundle by hand in the Play Console, then add the secret `GOOGLE_SERVICE_ACCOUNT_JSON` (a service account with release access) to the `play-store` environment.

The workflow builds an installable APK with the `preview` profile, and, when asked, an App Bundle with the `production` profile that it submits to Google Play. iOS builds run with `npx eas-cli build --platform ios` once an Apple Developer account is linked to the Expo project.
