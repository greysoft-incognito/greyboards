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
cp apps/web/.dev.vars.example apps/web/.dev.vars
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

Then, under the `greyboards-web` Worker's Settings → Variables and secrets, add `API_URL` (the public API address, such as `https://api.example.com/api`) and, optionally, `MAP_STYLE_URL`. `wrangler.jsonc` holds no variables, so deploys keep the dashboard values. Local values live in `apps/web/.dev.vars`.

## Mobile builds (EAS)

The Android app builds on [EAS](https://expo.dev/eas) from the **Deploy apps** workflow. A push to the `deploy` branch, or a manual run from the Actions tab, builds an installable APK. Only a published GitHub release builds an App Bundle and puts it on Google Play. That build skips EAS: it runs `expo prebuild` and Gradle on the GitHub runner and signs the bundle with our own upload key. The bundle id is `com.greysoft.greyboards.app` on both iOS and Android.

One-time setup, in GitHub → Settings → Secrets and variables → Actions:

- secret `EXPO_TOKEN`: an access token from expo.dev → Account settings → Access tokens, made by the Expo account that will own the app
- variable `EAS_OWNER`: that Expo account or organisation name
- variable `API_URL`: the public API address, such as `https://api.example.com/api`
- variable `WEB_URL` (optional): the web app's https address, so email links open the app

The first run creates the EAS project for the app (or finds it, if the account already has one called `greyboards`) and prints its id. Save that id as the variable `EAS_PROJECT_ID` to skip the lookup on later runs.

### Google Play

1. Make the upload keystore once, on your machine (it needs a JDK for `keytool`): `pnpm --filter @greyboards/mobile keystore`. It writes `apps/mobile/credentials/upload-keystore.jks` and `apps/mobile/credentials/github-secrets.env`, which git ignores. Keep both somewhere safe, such as a password manager: Play only accepts bundles signed with this key.
2. In GitHub → Settings → Environments → `play-store`, add each line of `github-secrets.env` as a secret: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD`. Add `GOOGLE_SERVICE_ACCOUNT_JSON` too (a service account with release access).
3. Upload the first App Bundle by hand in the Play Console (the release run keeps it as an artifact), with Play App Signing turned on. Play then knows the upload key, and later releases upload on their own.

Optional variables:

- `PLAY_CLOSED_TRACK`: the closed testing track, `alpha` unless set (use your custom track's name, such as `qa`)
- `PLAY_STORE_RELEASE_STATUS`: `completed` unless set; use `draft` until the app's first release is live

### Versions and releases

The version name is the release tag without its `v`, so `v1.4.0` and `1.4.0` both ship as `1.4.0`. The build number (Android `versionCode`) is `baseBuildNumber` in `apps/mobile/package.json` plus the workflow's run number, so every build gets a higher one. Raise `baseBuildNumber` if the run count ever starts over, for example after the workflow file is renamed. Builds that aren't releases keep the version in `app.json`.

The tag decides which Play tracks a release goes to. Each one also goes to every testing track below it:

| Release | Tag example | Tracks |
| --- | --- | --- |
| Production | `v1.4.0` | production, open, closed, internal |
| Open testing | `v1.4.0-beta.1` or `v1.4.0-rc.1`, or any release marked as a pre-release | open, closed, internal |
| Closed testing | `v1.4.0-alpha.1` | closed, internal |
| Internal testing | `v1.4.0-internal.1` | internal |

The "What's new" text comes from the `feat:` commits that touched `apps/mobile` since the previous tag, leaving out admin work, plus a line for fixes. The run's summary shows it and the tracks.

iOS builds run with `npx eas-cli build --platform ios` once an Apple Developer account is linked to the Expo project.
