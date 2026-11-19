# Deploying the API

The API (`apps/api`) is deployed over SSH by the **Deploy API** workflow (`.github/workflows/deploy-api.yml`). The workflow installs nothing on the server: install the software below once by hand, then every deploy only uploads, builds, migrates and restarts the API. Each deploy is a separate release, so a bad deploy can be rolled back.

## Dependencies

Install these on the server before the first deploy. Versions are the minimum tested.

| Software | Version | Why |
| --- | --- | --- |
| Node.js | 24 (22 at least) | Runs the API |
| pnpm | 10 | Installs and builds the API. Without a global install, the deploy uses corepack (bundled with Node 24) instead. |
| pm2 | latest | Keeps the API running and restarts it on deploy |
| PostgreSQL | 16 | Database |
| PostGIS | 3 | Board locations and distance searches (`CREATE EXTENSION postgis`) |
| git, tar, curl | any | Unpacking releases and the health check |
| nginx (or Caddy) | any | Optional: serves the API on a domain with TLS |
| certbot | any | Optional: TLS certificate for nginx |

The deploy runs `bash -l`, so `node`, `pnpm` and `pm2` must be on the `PATH` of a non-interactive login shell. Install Node system-wide, or load nvm from `~/.profile` rather than `~/.bashrc`.

On Ubuntu 24.04 or Debian 12, as root or with sudo:

```sh
# Node 24
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo bash -
sudo apt-get install -y nodejs git tar curl

# pnpm and pm2
sudo npm install -g pnpm@10 pm2

# PostgreSQL with PostGIS
sudo apt-get install -y postgresql postgresql-contrib postgis
sudo systemctl enable --now postgresql

# Optional: nginx and certbot
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

## One-time server setup

Run these as the SSH user the workflow logs in with, unless a step says `sudo`.

1. **Deploy directory**, owned by the SSH user:

   ```sh
   sudo mkdir -p /var/www/greyboards-api/shared
   sudo chown -R "$USER" /var/www/greyboards-api
   ```

2. **Database**: create a user and database, and enable PostGIS as the superuser (the API's user can't create extensions):

   ```sh
   sudo -u postgres psql -c "CREATE ROLE greyboards LOGIN PASSWORD 'choose-a-password'"
   sudo -u postgres psql -c "CREATE DATABASE greyboards OWNER greyboards"
   sudo -u postgres psql -d greyboards -c "CREATE EXTENSION IF NOT EXISTS postgis"
   ```

3. **Settings**: create `/var/www/greyboards-api/shared/.env` (mode 600) from the template under [Settings](#settings-sharedenv). Generate `APP_KEY` with `openssl rand -base64 32 | tr '+/' '-_' | tr -d '='`.

4. **pm2 on boot**: run `pm2 startup` once and run the command it prints. The first deploy starts the API as `greyboards-api` and saves the process list.

5. **Reverse proxy** (optional, with a domain): point the domain's DNS at the server, then add an nginx site and a certificate:

   ```nginx
   # /etc/nginx/sites-available/api.greyboards.com
   server {
       listen 80;
       server_name api.greyboards.com;
       client_max_body_size 30m;

       location / {
           proxy_pass http://127.0.0.1:3100;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```

   ```sh
   sudo ln -s /etc/nginx/sites-available/api.greyboards.com /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d api.greyboards.com
   ```

   With a reverse proxy, set `APP_HOST=127.0.0.1` and `TRUST_PROXY=1` in `.env`. Without one, use `APP_HOST=0.0.0.0` and the API answers on `http://<server-ip>:3100/api`.

6. **Scheduler**: add to the SSH user's crontab (`crontab -e`):

   ```
   * * * * * cd /var/www/greyboards-api/current/apps/api && pnpm exec ark schedule:run >> /dev/null 2>&1
   ```

## Settings (`shared/.env`)

Start from this template. It runs the API with fallbacks for services that aren't set up yet.

```sh
APP_NAME="Greyboards"
NODE_ENV=production
APP_ENV=preview
APP_URL=https://api.greyboards.com
FRONTEND_URL=https://greyboards.com
APP_HOST=127.0.0.1
APP_PORT=3100
APP_KEY=
JWT_EXPIRES_IN=30d
TRUST_PROXY=1
CORS_ALLOWED_ORIGINS=https://greyboards.com

DATABASE_URL="postgres://greyboards:choose-a-password@127.0.0.1:5432/greyboards?schema=public"
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=greyboards
DB_USERNAME=greyboards
DB_PASSWORD=choose-a-password

CACHE_STORE=memory
QUEUE_CONNECTION=sync
FILESYSTEM_DISK=local
UPLOADS_DISK=

# smtp | file | sendpulse. file saves mail to storage/framework/mails.
MAIL_TRANSPORT=file
MAIL_HOST=
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_API_KEY=
MAIL_FROM_ADDRESS=no-reply@greyboards.com
MAIL_FROM_NAME="Greyboards"

SMS_DRIVER=log
SMS_DEFAULT_COUNTRY_CODE=234

REALTIME_TRANSPORT=polling

PAYMENT_DRIVER=flutterwave
FLUTTERWAVE_PUBLIC_KEY=
FLUTTERWAVE_SECRET_KEY=
FLUTTERWAVE_WEBHOOK_HASH=

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=
AWS_BUCKET=
AWS_URL=
AWS_ENDPOINT=
```

The business defaults (commission, shares, fees and limits) are listed in `apps/api/.env.example`; admins change them later under Admin → Configuration.

| Service | Fallback | To turn it on |
| --- | --- | --- |
| Mail | Saved to `storage/framework/mails` | `MAIL_TRANSPORT=smtp` with the `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USERNAME`, `MAIL_PASSWORD` settings, or `MAIL_TRANSPORT=sendpulse` with `MAIL_API_KEY` |
| SMS | Logged (`SMS_DRIVER=log`) | Set `SMS_DRIVER` and the provider's keys |
| Uploads | Local disk in `shared/storage` | `UPLOADS_DISK=s3` and the `AWS_*` bucket settings (S3 or R2) |
| Payments | Checkout says payments are unavailable | `FLUTTERWAVE_PUBLIC_KEY`, `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_HASH`; webhook URL `<API>/api/payments/flutterwave/webhook` |
| Realtime | Polling | `REALTIME_TRANSPORT` and its keys |

Edit the file on the server, or keep the whole file in the `API_DOTENV` secret, which then replaces `shared/.env` on every deploy.

## When it runs

- **Push to `deploy`**: checks, then deploys with migrations.
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
2. **Settings**: if `API_DOTENV` is set, it replaces `shared/.env`.
3. **Upload**: `git archive` packs the API, the shared packages and the workspace manifests into `releases/<timestamp>-<sha>.tar.gz`.
4. **Release** (`.github/scripts/deploy-api.sh`): unpacks, links `.env` and `storage` to `shared/`, runs `pnpm install`, builds, migrates, switches `current` to the release and restarts it with pm2. If `http://127.0.0.1:<APP_PORT>/api` does not answer, it switches back to the previous release.
5. **Public check**: if the `API_URL` variable is set, the workflow requests it.

A failed install, build or migration stops before `current` changes, so the running API is untouched.

```
/var/www/greyboards-api/
├── current -> releases/20261117190000-28324cc
├── releases/
└── shared/
    ├── .env          # production settings
    └── storage/      # local uploads, saved mail, logs; kept across releases
```

## GitHub settings

Settings → Secrets and variables → Actions. Secrets can also live on the `api-production` environment, which the deploy job uses.

**Secrets**

| Name | Required | Value |
| --- | --- | --- |
| `SSH_HOST` | yes | Server hostname or IP |
| `SSH_USERNAME` | yes | SSH user |
| `SSH_PASSWORD` or `SSH_KEY` | one of them | The user's password, or a private key (used first when both are set) |
| `SSH_PORT` | no | SSH port, default 22 |
| `SSH_KNOWN_HOSTS` | recommended | Output of `ssh-keyscan -p <port> <host>`. Without it the workflow trusts whatever key the host presents. |
| `API_DOTENV` | no | A full `.env` for the API, replacing `shared/.env` on every deploy |

**Variables**

| Name | Default | Value |
| --- | --- | --- |
| `API_DEPLOY_PATH` | `/var/www/greyboards-api` | Deploy directory |
| `API_URL` | none | Public API address, e.g. `https://api.greyboards.com/api`, checked after each deploy |
| `API_PM2_NAME` | `greyboards-api` | pm2 process name |
| `API_RESTART_COMMAND` | none | Replaces the pm2 restart, run in `current/apps/api` |

## After the first deploy

**First admin**: sign up, then:

```sh
cd /var/www/greyboards-api/current/apps/api && pnpm exec ark users:role you@example.com admin
```

**Demo data on staging**: on a staging or preview server, never production, this wipes the database and fills it with the demo accounts listed in [apps/api/README.md](../apps/api/README.md#mock-data):

```sh
cd /var/www/greyboards-api/current/apps/api && pnpm exec ark migrate:fresh && pnpm exec ark db:mock
```

## Troubleshooting

- **`Missing .../shared/.env`**: create it (setup step 3), or set `API_DOTENV`.
- **`pm2: command not found`, or `pnpm` and `corepack` both missing**: they aren't on the login shell's `PATH`; see [Dependencies](#dependencies).
- **`Unable to sync ArkORM model registry: Models directory not found`**: a harmless warning during install; the API's models live in `src/app/models`.
- **`extension "postgis" is not available`**: install PostGIS for your PostgreSQL version, e.g. `postgresql-16-postgis-3`.
- **Health check failed**: the release was rolled back. Check `pm2 logs greyboards-api` and `shared/storage/logs`, and that `APP_PORT` in `.env` is the port the API listens on.
- **A migration failed**: nothing was switched. Fix it and deploy again.
