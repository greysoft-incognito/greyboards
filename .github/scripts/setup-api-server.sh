#!/usr/bin/env bash
# Runs on the API server before each deploy. Installs whatever the API needs and is
# missing (Node, pnpm, pm2, PostgreSQL with PostGIS), creates the database and a
# starter shared/.env on the first run, and optionally puts nginx in front of the API.
# Safe to run again: anything already in place is left alone.
#
# Environment: DEPLOY_PATH, APP_PORT, API_DOMAIN, API_URL, FRONTEND_URL, CORS_ALLOWED_ORIGINS

set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/var/www/greyboards-api}"
APP_PORT="${APP_PORT:-3100}"
API_DOMAIN="${API_DOMAIN:-}"
NODE_MAJOR=24
DB_NAME=greyboards
DB_USER=greyboards
SHARED="$DEPLOY_PATH/shared"
ENV_FILE="$SHARED/.env"

export DEBIAN_FRONTEND=noninteractive

log() { printf '\n==> %s\n' "$*"; }

as_root() {
  if [ "$(id -u)" -eq 0 ]; then "$@"; else sudo -n "$@"; fi
}

has() { command -v "$1" >/dev/null 2>&1; }

secret() { openssl rand -base64 "$1" | tr '+/' '-_' | tr -d '=\n'; }

env_value() {
  grep -E "^$1=" "$ENV_FILE" 2>/dev/null | tail -n1 | cut -d= -f2- | tr -d '"'"'"
}

apt_updated=false

apt_install() {
  if [ "$apt_updated" = false ]; then
    as_root apt-get update -qq
    apt_updated=true
  fi

  as_root apt-get install -y -qq "$@" >/dev/null
}

install_base() {
  local missing=()

  for tool in curl openssl gpg; do
    has "$tool" || missing+=("$tool")
  done

  [ ${#missing[@]} -eq 0 ] && return

  log "Installing ${missing[*]}"
  apt_install curl openssl gnupg ca-certificates
}

install_node() {
  local major=0

  has node && major="$(node -p 'process.versions.node.split(".")[0]')"
  [ "$major" -ge 22 ] && return

  log "Installing Node $NODE_MAJOR"
  curl -fsSL "https://deb.nodesource.com/setup_$NODE_MAJOR.x" | as_root bash - >/dev/null
  apt_install nodejs
}

install_node_tools() {
  if ! has pnpm; then
    log "Installing pnpm"
    as_root npm install -g --silent pnpm@10
  fi

  if ! has pm2; then
    log "Installing pm2"
    as_root npm install -g --silent pm2
  fi
}

install_postgres() {
  if ! has psql || ! as_root test -d /etc/postgresql; then
    log "Installing PostgreSQL with PostGIS"
    apt_install postgresql postgresql-contrib postgis
  fi

  local version
  version="$(ls /etc/postgresql | sort -V | tail -n1)"

  if ! ls "/usr/share/postgresql/$version/extension/postgis.control" >/dev/null 2>&1; then
    log "Installing PostGIS for PostgreSQL $version"
    apt_install "postgresql-$version-postgis-3"
  fi

  as_root systemctl enable --now postgresql >/dev/null 2>&1 || as_root service postgresql start
}

pg() {
  if [ "$(id -u)" -eq 0 ]; then
    (cd / && runuser -u postgres -- psql -v ON_ERROR_STOP=1 -qtAX "$@")
  else
    (cd / && sudo -n -u postgres psql -v ON_ERROR_STOP=1 -qtAX "$@")
  fi
}

create_database() {
  local password="$1"

  log "Creating the $DB_NAME database"

  if [ "$(pg -c "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'")" != "1" ]; then
    pg -c "CREATE ROLE $DB_USER LOGIN PASSWORD '$password'"
  else
    pg -c "ALTER ROLE $DB_USER PASSWORD '$password'"
  fi

  if [ "$(pg -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'")" != "1" ]; then
    pg -c "CREATE DATABASE $DB_NAME OWNER $DB_USER"
  fi
}

enable_postgis() {
  local host database
  host="$(env_value DB_HOST)"
  database="$(env_value DB_DATABASE)"

  case "${host:-127.0.0.1}" in
    127.0.0.1|localhost) ;;
    *) return ;;
  esac

  pg -d "${database:-$DB_NAME}" -c 'CREATE EXTENSION IF NOT EXISTS postgis'
}

write_env() {
  local db_password app_url frontend_url app_host=0.0.0.0 trust_proxy=false
  db_password="$(secret 24)"
  app_url="${API_URL:-http://$(curl -fsS4 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}'):$APP_PORT}"
  app_url="${app_url%/api}"
  frontend_url="${FRONTEND_URL:-$app_url}"

  if [ -n "$API_DOMAIN" ]; then
    app_host=127.0.0.1
    trust_proxy=1
  fi

  create_database "$db_password"

  log "Writing a starter $ENV_FILE"
  mkdir -p "$SHARED"
  umask 077

  cat > "$ENV_FILE" <<EOF
APP_NAME="Greyboards"
NODE_ENV=production
# Mail is saved to storage/framework/mails until this is production and MAIL_API_KEY (SendPulse) is set.
APP_ENV=preview
APP_URL=$app_url
FRONTEND_URL=$frontend_url
APP_HOST=$app_host
APP_PORT=$APP_PORT
APP_KEY=$(secret 32)
JWT_EXPIRES_IN=30d
TRUST_PROXY=$trust_proxy
CORS_ALLOWED_ORIGINS=${CORS_ALLOWED_ORIGINS:-$frontend_url}

DATABASE_URL="postgres://$DB_USER:$db_password@127.0.0.1:5432/$DB_NAME?schema=public"
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=$DB_NAME
DB_USERNAME=$DB_USER
DB_PASSWORD=$db_password

CACHE_STORE=memory
QUEUE_CONNECTION=sync
FILESYSTEM_DISK=local
UPLOADS_DISK=

MAIL_TRANSPORT=file
MAIL_API_KEY=
MAIL_FROM_ADDRESS=no-reply@greyboards.com
MAIL_FROM_NAME="Greyboards"

# Texts are logged until an SMS provider is set, e.g. SMS_DRIVER=africastalking.
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
EOF
}

configure_nginx() {
  [ -n "$API_DOMAIN" ] || return 0

  local site="/etc/nginx/sites-available/$API_DOMAIN"
  as_root test -f "$site" && return 0

  has nginx || { log "Installing nginx"; apt_install nginx; }

  log "Pointing nginx for $API_DOMAIN at port $APP_PORT"
  as_root tee "$site" >/dev/null <<EOF
server {
    listen 80;
    server_name $API_DOMAIN;
    client_max_body_size 30m;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

  as_root ln -sfn "$site" "/etc/nginx/sites-enabled/$API_DOMAIN"
  as_root nginx -t >/dev/null
  as_root systemctl reload nginx

  if has certbot; then
    as_root certbot --nginx -d "$API_DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect \
      || echo "certbot could not issue a certificate for $API_DOMAIN yet. Check its DNS record." >&2
  fi
}

enable_pm2_on_boot() {
  local unit="pm2-$(id -un)"

  as_root systemctl is-enabled "$unit" >/dev/null 2>&1 && return 0

  log "Starting pm2 on boot"
  as_root env PATH="$PATH" "$(command -v pm2)" startup systemd -u "$(id -un)" --hp "$HOME" >/dev/null \
    || echo "Could not register pm2 to start on boot. Run 'pm2 startup' once as this user." >&2
}

report_unset() {
  local unset=()

  for name in MAIL_API_KEY FLUTTERWAVE_SECRET_KEY FLUTTERWAVE_WEBHOOK_HASH AWS_BUCKET; do
    [ -n "$(env_value "$name")" ] || unset+=("$name")
  done

  [ "$(env_value SMS_DRIVER)" = "log" ] && unset+=("SMS provider (SMS_DRIVER=log)")

  if [ ${#unset[@]} -gt 0 ]; then
    log "Not configured yet: ${unset[*]}"
  fi
}

install_base
install_node
install_node_tools
install_postgres

mkdir -p "$DEPLOY_PATH/releases" "$SHARED"

if [ ! -f "$ENV_FILE" ]; then
  write_env
fi

enable_postgis
configure_nginx
enable_pm2_on_boot
report_unset

log "Server ready"
