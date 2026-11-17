# Deploying the API

The API (`apps/api`) is deployed over SSH by the **Deploy API** workflow (`.github/workflows/deploy-api.yml`). Each deploy is a separate release on the server, so a bad deploy can be rolled back.

## When it runs

- **Publishing a GitHub release**: checks, then deploys the release's tag with migrations.
- **Push to `deploy`**: same as a release.
- **Manually**: Actions → Deploy API → Run workflow, picking the branch or tag. Options:

| Option | Default | What it does |
| --- | --- | --- |
| `action` | `deploy` | `deploy`, or `rollback` to the release before the current one. A rollback does not undo migrations. |
| `skip_migrations` | off | Deploy without running `ark migrate`. |
| `run_checks` | on | Typecheck and test before deploying. |
| `keep_releases` | `5` | How many releases stay on the server. |

Runs never overlap: a second deploy waits for the first to finish.

## How a deploy works

1. **Check**: typecheck and test the API against a throwaway PostGIS database.
2. **Prepare the server** (`.github/scripts/setup-api-server.sh`): installs whatever is missing (Node 24, pnpm, pm2, PostgreSQL with PostGIS), and on the first run creates the `greyboards` database and user and a starter `shared/.env`. With `API_DOMAIN` set it also adds an nginx site for that domain (and a certificate when certbot is installed). Anything already in place is left alone, so later runs take seconds.
3. **Upload**: `git archive` packs the API, the shared packages and the workspace manifests into `releases/<timestamp>-<sha>.tar.gz`.
4. **Release** (`.github/scripts/deploy-api.sh`): unpacks, links `.env` and `storage` to `shared/`, installs, builds, migrates, switches `current` to the release and restarts it with pm2. If `http://127.0.0.1:<APP_PORT>/api` does not answer, it switches back to the previous release.
5. **Public check**: if the `API_URL` variable is set, the workflow requests it.

The first run needs root or passwordless sudo for the SSH user, to install packages. Later runs only need sudo if something is missing.

```
/var/www/greyboards-api/
├── current -> releases/20261117190000-28324cc
├── releases/
└── shared/
    ├── .env          # production settings
    └── storage/      # local uploads, saved mail, logs; kept across releases
```

## Settings (`shared/.env`)

The starter `.env` runs the API with fallbacks for services that aren't set up yet:

| Service | Fallback | To turn it on |
| --- | --- | --- |
| Mail | Saved to `storage/framework/mails` (`APP_ENV=preview`, `MAIL_TRANSPORT=file`) | Set `MAIL_API_KEY` (SendPulse) and `APP_ENV=production` |
| SMS | Logged (`SMS_DRIVER=log`) | Set `SMS_DRIVER` and the provider's keys |
| Uploads | Local disk in `shared/storage` | `UPLOADS_DISK=s3` and the `AWS_*` bucket settings (S3 or R2) |
| Payments | Checkout says payments are unavailable | `FLUTTERWAVE_PUBLIC_KEY`, `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_HASH`; webhook URL `<API>/api/payments/flutterwave/webhook` |
| Realtime | Polling | `REALTIME_TRANSPORT` and its keys |

Edit it on the server, or keep the whole file in the `API_DOTENV` secret, which then replaces `shared/.env` on every deploy. Every deploy prints which of these are still unset.

## GitHub settings

Settings → Secrets and variables → Actions. Secrets can also live on the `api-production` environment, which the deploy job uses.

**Secrets**

| Name | Required | Value |
| --- | --- | --- |
| `API_SSH_HOST` | yes | Server hostname or IP |
| `API_SSH_USER` | yes | SSH user |
| `API_SSH_KEY` or `API_SSH_PASSWORD` | one of them | Private key (preferred), or the user's password |
| `API_SSH_PORT` | no | SSH port, default 22 |
| `API_SSH_KNOWN_HOSTS` | recommended | Output of `ssh-keyscan -p <port> <host>`. Without it the workflow trusts whatever key the host presents. |
| `API_DOTENV` | no | A full `.env` for the API, replacing `shared/.env` on every deploy |

**Variables**

| Name | Default | Value |
| --- | --- | --- |
| `API_DEPLOY_PATH` | `/var/www/greyboards-api` | Deploy directory |
| `API_PORT` | `3100` | Port for a new `.env` |
| `API_DOMAIN` | none | e.g. `api.greyboards.com`. Adds an nginx site and keeps the API on `127.0.0.1`. Without it the API listens on `0.0.0.0:<API_PORT>`. |
| `API_URL` | none | Public API address, e.g. `https://api.greyboards.com/api`. Used for the public check and for `APP_URL` in a new `.env`. |
| `FRONTEND_URL` | `APP_URL` | Web app address, for a new `.env` |
| `API_PM2_NAME` | `greyboards-api` | pm2 process name |
| `API_RESTART_COMMAND` | none | Replaces the pm2 restart, run in `current/apps/api` |

## After the first deploy

- **First admin**: sign up, then `cd /var/www/greyboards-api/current/apps/api && pnpm exec ark users:role you@example.com admin`.
- **Scheduler**: add `* * * * * cd /var/www/greyboards-api/current/apps/api && pnpm exec ark schedule:run >> /dev/null 2>&1` to the SSH user's crontab.

## Troubleshooting

- **Health check failed**: the release was rolled back. Check `pm2 logs greyboards-api` and `shared/storage/logs`.
- **`sudo: a password is required`**: give the SSH user passwordless sudo, or install the missing software once by hand.
- **A migration failed**: nothing was switched. Fix it and deploy again.
