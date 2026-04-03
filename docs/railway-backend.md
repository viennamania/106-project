# Railway Backend Notes

This project can keep the frontend on Vercel and use Railway for operational backend work.

## Why Railway helps here

- `thirdweb` webhook delivery is not consistently arriving at the app.
- Signup recovery currently depends on request-time reconciliation.
- Railway is a better place to run long-lived workers and cron-driven reconciliation.

## Recommended split

1. Keep the public web app on Vercel.
2. Run a Railway API service from the same repo for backend-only routes.
3. Run a Railway cron or worker service from the same repo to reconcile pending signups.

## Endpoints added for Railway

- `GET /api/health`
  - Returns `200` only when required env vars are present and MongoDB is reachable.
- `POST /api/internal/reconcile-signups`
  - Protected by `Authorization: Bearer <token>`.
  - Re-checks pending members and completes them when chain data proves the payment.

## Environment variables

Shared between Vercel and Railway:

- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `PROJECT_WALLET`
- `THIRDWEB_SECRET_KEY`
- `THIRDWEB_WEBHOOK_SECRETS`
- `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`

Railway-only additions:

- `RECONCILE_API_TOKEN`
  - Secret used by Railway cron and worker calls.
- `RECONCILE_BASE_URL`
  - Public base URL of the backend service, for example `https://api.example.com`.
- `RECONCILE_LIMIT`
  - Optional batch size for each reconciliation run. Default is `25`.
- `RECONCILE_INTERVAL_MS`
  - Optional worker loop interval. Default is `30000`.
- `RECONCILE_EMAIL`
  - Optional email filter for one-off manual reconciliation runs.

## Railway service setup

### API service

- Source repo: this repository
- Root directory: `/`
- Start command: `pnpm start`
- Healthcheck path: `/api/health`

Point `THIRDWEB_WEBHOOK_BASE_URL` to this Railway API service if you want webhook ingress handled there.

### Cron service

- Source repo: this repository
- Root directory: `/`
- Start command: `pnpm reconcile:pending`
- Schedule: every 1 to 5 minutes
- Required env vars:
  - `RECONCILE_API_TOKEN`
  - `RECONCILE_BASE_URL`

### Worker service

- Source repo: this repository
- Root directory: `/`
- Start command: `pnpm reconcile:worker`
- Required env vars:
  - `RECONCILE_API_TOKEN`
  - `RECONCILE_BASE_URL`

Use the worker when you want tighter recovery than cron alone.

## Suggested rollout

1. Deploy the API service to Railway and verify `/api/health`.
2. Add `RECONCILE_API_TOKEN`.
3. Deploy a cron service that runs every 2 minutes.
4. Confirm `POST /api/internal/reconcile-signups` completes old `pending_payment` rows.
5. Optionally move the `thirdweb` webhook target from Vercel to Railway after the API service is stable.

## Scripts

- `pnpm reconcile:pending`
  - Sends one authenticated reconciliation request.
- `pnpm reconcile:worker`
  - Repeats reconciliation in a loop.
