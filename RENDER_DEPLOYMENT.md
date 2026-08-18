# TradingGuardAI: Manus Frontend + Render Backend

This project can remain live on Manus while its Node/Express backend is deployed from GitHub to Render. The Render service is defined in `render.yaml` and exposes the API, OAuth callback, file-storage proxy, health check, and scheduled scanner endpoint.

## Architecture

| Component | Runtime | Responsibility |
|---|---|---|
| Manus web app | Existing published deployment | Serves the React interface and remains the primary user-facing URL. |
| Render web service | `pnpm start` | Runs Express, tRPC, OAuth callback, database access, Supabase mirroring, Twelve Data polling, and Telegram delivery. |
| MySQL/TiDB database | Existing database or Render-compatible external database | Stores users, strategy rules, audit history, generated signals, outcomes, and settings. |
| Heartbeat | Managed scheduler | POSTs to `/api/scheduled/trading-guard-scanner`; keep only one active scanner schedule. |

## Render setup

Create a Render Web Service from the GitHub repository and select the repository root. Render can use the checked-in `render.yaml` Blueprint, or the equivalent manual settings: build command `corepack enable && pnpm install --frozen-lockfile && pnpm build`, start command `pnpm start`, and health-check path `/healthz`. Enable automatic deploys from the selected branch.

Add every `sync: false` variable from `render.yaml` in Render’s Environment settings. Copy values from the existing secure Manus configuration; do not commit `.env` files, API keys, bot tokens, database URLs, or JWT secrets to GitHub. The Render service must use the same database and the same Supabase project if both deployments are expected to share data.

## Connect the Manus frontend to Render

After Render assigns an HTTPS URL, set the Manus frontend variable `VITE_API_BASE_URL` to that URL, for example `https://trading-guard-ai-api.onrender.com`. The frontend will then call `${VITE_API_BASE_URL}/api/trpc` and use `${VITE_API_BASE_URL}/api/oauth/callback` for login. Set Render’s `FRONTEND_ORIGIN` to the exact Manus origin, for example `https://tradingai-x2copqwk.manus.space`, so credentialed CORS requests are accepted.

The Manus OAuth application must allow the Render callback URL as a redirect URI. If the OAuth provider only allows the Manus origin, keep authentication and the API on Manus instead of splitting the backend; otherwise login will fail even though the Render health check succeeds.

## Scanner and Telegram

Do not create a second scanner schedule during migration. The existing Heartbeat job should target the backend that owns the production database and Telegram secrets. If the Render service becomes the scanner owner, update the callback URL to `https://<render-service>/api/scheduled/trading-guard-scanner`, preserve the cron cadence, and persist the new task UID in `app_settings`. Disable the old Manus-targeting job only after the Render endpoint has passed `/healthz`, OAuth, database, Twelve Data, and Telegram checks.

## Validation checklist

Open `/healthz` and confirm `{ "ok": true }`. Sign in through the Render OAuth callback, upload a small strategy text file, run one Chat audit, and confirm the audit row is visible in the shared database. Verify a Twelve Data OHLCV request, send one Telegram diagnostic message, and inspect the Heartbeat run history. Only after all checks pass should the Render backend become the scanner owner.

## Important limitation

The current Manus deployment remains live and is not replaced by this configuration. Render is an optional backend deployment path. The safest migration is staged: deploy Render, validate it against the shared database, point the Manus frontend to Render, then move the scanner schedule last.
