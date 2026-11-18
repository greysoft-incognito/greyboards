# Deploying the web app

The web app (`apps/web`) runs on Cloudflare Workers with server rendering. The **Deploy web** workflow (`.github/workflows/deploy-web.yml`) builds it and uploads it with Wrangler, using the settings in `apps/web/wrangler.jsonc`. Static assets are served by Workers from the same deploy, so there is no separate bucket or Pages project.

## When it runs

- **Publishing a GitHub release**: deploys the release's tag, same as the API.
- **Push to `deploy`**: deploys that commit.
- **Manually**: Actions → Deploy web → Run workflow, picking the branch or tag. Turn off `run_checks` to skip the typecheck.

Runs never overlap: a second deploy waits for the first to finish.

## One-time Cloudflare setup

1. Sign in to the Cloudflare dashboard and copy the **Account ID** from Workers & Pages → Overview.
2. My Profile → API Tokens → Create Token → **Edit Cloudflare Workers** template. Limit it to your account and, if you use a custom domain, to that domain's zone. The template already includes the Workers Scripts, Workers Routes and zone permissions a custom domain needs.
3. To serve the app on your own domain, add the domain to Cloudflare as a zone first. The workflow attaches it to the Worker on each deploy and Cloudflare issues the certificate.

The first deploy creates the Worker, named `greyboards-web` unless `WEB_WORKER_NAME` says otherwise. Without a custom domain it is still reachable at `https://greyboards-web.<your-subdomain>.workers.dev`.

## GitHub settings

Settings → Secrets and variables → Actions. Secrets and variables can also live on the `web-production` environment, which the deploy job uses.

**Secrets**

| Name | Required | Value |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | yes | The API token from step 2 |
| `CLOUDFLARE_ACCOUNT_ID` | yes | The account ID from step 1 |

**Variables**

| Name | Default | Value |
| --- | --- | --- |
| `API_URL` | none, required | Public API address the web app calls, e.g. `https://api.greyboards.com/api` |
| `MAP_STYLE_URL` | OpenFreeMap | MapLibre style URL for every map |
| `WEB_DOMAINS` | none | Custom domains for the Worker, comma separated, e.g. `greyboards.com,www.greyboards.com` |
| `WEB_URL` | none | The app's public address, opened after each deploy as a check and shown on the run. Also used by mobile builds and API emails. |
| `WEB_WORKER_NAME` | `greyboards-web` | Worker name |

`API_URL` and `MAP_STYLE_URL` are set as Worker variables on every deploy and override the local defaults in `wrangler.jsonc`.

## Deploying from a computer

```sh
cd apps/web
pnpm exec wrangler login
pnpm run build
pnpm exec wrangler deploy --var "API_URL:https://api.greyboards.com/api"
```

`pnpm deploy:web` from the repository root does the same with the defaults in `wrangler.jsonc`. `pnpm exec wrangler deploy --dry-run` checks the upload without sending it.

## Rolling back

Cloudflare keeps earlier versions of the Worker. Roll back from Workers & Pages → greyboards-web → Deployments, or with `pnpm exec wrangler rollback` in `apps/web`.

## Troubleshooting

- **`Missing secret ...` or `Missing variable API_URL`**: add it under GitHub settings above.
- **`Authentication error [code: 10000]`**: the token is wrong, expired, or not scoped to the account in `CLOUDFLARE_ACCOUNT_ID`.
- **Custom domain fails to attach**: the domain must be a zone on the same Cloudflare account, and the token needs access to that zone. A DNS record that already points elsewhere has to be removed first.
- **Pages load but data is missing**: `API_URL` is wrong, or the API cannot be reached from Cloudflare.
- **Browser requests to the API are blocked**: add the web address to the API's `FRONTEND_URL` or `CORS_ALLOWED_ORIGINS`.
