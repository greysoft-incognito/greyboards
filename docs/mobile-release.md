# Releasing the mobile app

The Android app ships from the **Deploy apps** workflow (`.github/workflows/deploy-apps.yml`). There are two kinds of run:

- **Test builds:** a push to the `deploy` branch, or a manual run from the Actions tab, builds an installable APK on EAS. Nothing goes to Google Play.
- **Releases:** publishing a GitHub release builds a signed App Bundle and APK on the GitHub runner with Gradle (no EAS), uploads the bundle to Google Play, shares the APK on EAS, and saves the released version back to `app.json`.

The app id is `com.greysoft.greyboards.app` on both Android and iOS.

## One-time setup

### 1. Expo and the app's settings

In GitHub → Settings → Secrets and variables → Actions:

| Name | Kind | What it is |
| --- | --- | --- |
| `EXPO_TOKEN` | secret | Access token from expo.dev → Account settings → Access tokens, made by the Expo account that owns the app |
| `EAS_OWNER` | variable | That Expo account or organisation name |
| `API_URL` | variable | The public API address, such as `https://api.example.com/api` |
| `WEB_URL` | variable, optional | The web app's https address, so email links open the app |
| `EAS_PROJECT_ID` | variable | The EAS project id. The first test build prints it; save it here |

### 2. The upload keystore

Releases are signed with our own upload key. Make it once, on a machine with a JDK (for `keytool`):

```sh
pnpm --filter @greyboards/mobile keystore
```

This writes two files to `apps/mobile/credentials/`, which git ignores:

- `upload-keystore.jks`: the keystore
- `github-secrets.env`: the values for the GitHub secrets below

Keep both somewhere safe, such as a password manager. Once Play has seen this key it only accepts bundles signed with it, so losing it means asking Google to reset the upload key. The script won't overwrite an existing keystore.

### 3. The `play-store` environment

In GitHub → Settings → Environments, create `play-store` and add these secrets:

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | From `github-secrets.env` |
| `ANDROID_KEYSTORE_PASSWORD` | From `github-secrets.env` |
| `ANDROID_KEY_ALIAS` | From `github-secrets.env` |
| `ANDROID_KEY_PASSWORD` | From `github-secrets.env` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | The JSON key of a Google Cloud service account that has release access to the app in the Play Console (Users and permissions) |

Optional variables:

| Variable | Default | Use |
| --- | --- | --- |
| `PLAY_CLOSED_TRACK` | `alpha` | Name of the closed testing track, such as `qa` |
| `PLAY_STORE_RELEASE_STATUS` | `completed` | Use `draft` until the app's first release is live in Play |
| `RELEASE_COMMIT_NAME`, `RELEASE_COMMIT_EMAIL` | `3m1n3nc3` | Who the version commit on main is from |

### 4. The first Play upload

Google Play's API can't upload to an app that has never had a release, so the first bundle goes up by hand:

1. Create the app in the Play Console with the id `com.greysoft.greyboards.app`, and turn on Play App Signing.
2. Publish a GitHub release (see below). The Play upload step fails this first time, but the run keeps the bundle as an artifact named `greyboards-<version>-<build>-aab`.
3. Download it and upload it to the internal testing track in the Play Console. Play now knows our upload key.

Every release after that uploads on its own.

### 5. Play tracks

The workflow uses Play's standard track names:

| Track | Play name |
| --- | --- |
| Production | `production` |
| Open testing | `beta` |
| Closed testing | `alpha`, or `PLAY_CLOSED_TRACK` |
| Internal testing | `internal` |

Set up the testers for each testing track in the Play Console.

## Cutting a release

1. Merge everything for the release into main.
2. On GitHub, go to Releases → Draft a new release.
3. Create a tag on main, for example `v1.4.0`. The tag can start with `v` or not.
4. Tick **Set as a pre-release** for a test release, or leave it clear for production.
5. Publish. The release run starts in the Actions tab.

The tag decides which tracks the release goes to. Each release also goes to every testing track below it:

| Release | Tag | Tracks |
| --- | --- | --- |
| Production | `v1.4.0` | production, open, closed, internal |
| Open testing | `v1.4.0-beta.1`, `v1.4.0-rc.1`, or any release marked as a pre-release | open, closed, internal |
| Closed testing | `v1.4.0-alpha.1` | closed, internal |
| Internal testing | `v1.4.0-internal.1` | internal |

A tag's suffix wins over the pre-release tick, so `v1.4.0-alpha.1` goes to closed testing either way. Any other suffix, such as `v1.4.0-foo`, counts as open testing. A tag that isn't a version, such as `release-1`, stops the run.

## Versions and build numbers

- **Version name:** the tag without its `v`, so `v1.4.0` and `1.4.0` both ship as `1.4.0`, and `v1.4.0-beta.1` ships as `1.4.0-beta.1`.
- **Build number** (Android `versionCode`, iOS `buildNumber`): `baseBuildNumber` in `apps/mobile/package.json` plus the workflow's run number. Every run of the workflow gets a higher number, so each upload is accepted.

If the run count ever starts over, for example after the workflow file is renamed, raise `baseBuildNumber` above the last build number in Play.

Test builds that aren't releases use the version in `app.json`.

## What's new notes

Each release writes Play's "What's new" text from the `feat:` commits that touched `apps/mobile` since the previous tag. It leaves out admin work and commits scoped to other apps (`api`, `web`, `ci`, `deps`, `docs`), adds "Fixes and small improvements." when there were fixes, and keeps the text within Play's 500 characters.

The notes come straight from commit titles, so write mobile `feat:` commits the way a user should read them, such as `feat(mobile): book boards and bid on dates`. The run summary shows the notes and the tracks, and you can edit them in the Play Console before a release goes out.

The script is `apps/mobile/scripts/release.mjs`. To preview the notes for a tag locally:

```sh
RELEASE_TAG=v1.4.0 WHATS_NEW_DIR=/tmp/whatsnew node apps/mobile/scripts/release.mjs
cat /tmp/whatsnew/whatsnew-en-US
```

## APK on EAS

Each release also builds an APK signed with the same key. The run keeps it as an artifact, and, when `EXPO_TOKEN` and `EAS_PROJECT_ID` are set, uploads it to EAS with `eas upload`. The run summary links to the expo.dev page, which has an install link and QR code for testers outside Play.

A failed EAS upload doesn't stop the release.

## Version commit on main

After the Play upload, the workflow writes the released version and build number into `apps/mobile/app.json` and pushes it to main as `chore(mobile): release <version> (<build>) [skip ci]`. Local builds and test builds then carry the same version as the store.

If main is protected, allow GitHub Actions to push to it (or add it to the rule's bypass list), otherwise this step fails after the upload has already gone through.

## Local builds

Local builds don't use EAS. From `apps/mobile`:

| Command | What it does |
| --- | --- |
| `pnpm android:studio` | Generates the native Android project and opens it in Android Studio |
| `pnpm ios:xcode` | Generates the native iOS project and opens it in Xcode (macOS only) |

Both use the version in `app.json` and the API address in `apps/mobile/.env` (copy `.env.example`). The generated `android/` and `ios/` folders aren't committed, so run the command again after changing `app.json` or adding a native package.

To make a signed release build in Android Studio, use Build → Generate Signed App Bundle or APK with `credentials/upload-keystore.jks`.

The workflow doesn't build for iOS yet. Once an Apple Developer account is linked to the Expo project, iOS builds run with `npx eas-cli build --platform ios`.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| "isn't a release version" | The tag must look like `v1.2.3`, `1.2.3` or `v1.2.3-beta.1`. Delete the release and tag, and publish again with a valid tag |
| "Add ANDROID_KEYSTORE_BASE64…" | The keystore secrets are missing from the `play-store` environment |
| Play upload: "Package not found" | The app has never had a release. Do the first upload by hand (step 4) |
| Play upload: "APK signed with the wrong key" | The bundle wasn't signed with the key Play knows. Check the keystore secrets match the keystore used for the first upload |
| Play upload: "Version code has already been used" | Raise `baseBuildNumber` in `apps/mobile/package.json` above the last build number in Play |
| Play upload: "Only releases with status draft may be created on draft app" | Set `PLAY_STORE_RELEASE_STATUS` to `draft` until the first release is live |
| Play upload: track not found | The closed track has another name. Set `PLAY_CLOSED_TRACK` |
| EAS upload skipped | Add `EXPO_TOKEN` and `EAS_PROJECT_ID` |
| Version commit rejected | Main is protected. Let GitHub Actions push to it |
| Release published but no run | Check the release was published, not saved as a draft |

To retry a release that failed before the Play upload, re-run the failed job from the Actions tab. A re-run keeps the same build number, so if the bundle already reached Play, publish a new release instead.
