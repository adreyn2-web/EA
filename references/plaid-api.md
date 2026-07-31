# Plaid API Reference

**Last updated:** 2026-07-31
**Grounded in:** actual integration code at `projects/finance/plaid/link.js` and `projects/finance/plaid/sync.js` (Node SDK `plaid@^26.0.0`). Sections marked *(generic)* aren't yet exercised by this repo's code and are documented from Plaid's public docs for when the integration grows.

---

## What This Repo Actually Does

- **Auth/link (one-time per institution):** `npm run plaid:link` → `plaid/link.js` spins up a local HTTP server (port 3001), creates a `link_token` via `linkTokenCreate`, serves Plaid Link in the browser, and on success exchanges the `public_token` for a permanent `access_token` via `itemPublicTokenExchange`. Tokens are saved keyed by institution name to `projects/finance/data/access_tokens.json` (gitignored).
- **Sync (recurring):** `npm run plaid:sync` → `plaid/sync.js` loads saved tokens, calls `accountsBalanceGet` for balances and `transactionsGet` for a rolling 30-day transaction window per institution, and writes everything to `projects/finance/data/snapshot.json` (gitignored). `summary.js` reads that snapshot to render the cash/debt report used by `finance-tracker` and the dashboard.
- **Products enabled:** `Products.Transactions` only (set in `linkTokenCreate`). No Investments, Liabilities, or Identity products wired up.
- **Environment:** `PLAID_ENV` in `.env` selects `PlaidEnvironments[PLAID_ENV]` (`sandbox` / `development` / `production`) — check `.env` for which one is currently active before assuming live data.

---

## Auth Flow (as implemented here)

1. **Create a Link token** — `client.linkTokenCreate({ user, client_name, products: [Products.Transactions], country_codes: [CountryCode.Us], language: 'en' })`. Link tokens are short-lived (expire ~4 hours if unused) and single-use for starting a Link session.
2. **Run Plaid Link client-side** — `link.js` serves a minimal HTML page loading `https://cdn.plaid.com/link/v2/stable/link-initialize.js`, initialized with the link token. This repo does not use React/the hosted Plaid Link SDK wrapper — just the raw script tag.
3. **Exchange `public_token` → `access_token`** — on Link's `onSuccess` callback, the browser POSTs `public_token` + institution name to a local `/exchange` route, which calls `itemPublicTokenExchange`. The returned `access_token` and `item_id` are persisted **unencrypted** in `access_tokens.json`.
4. **Use the `access_token`** for all subsequent per-institution calls (`accountsBalanceGet`, `transactionsGet`). It does not expire on its own but goes invalid if the user revokes access, changes their bank password (may require re-Link via `update` mode — not yet implemented here), or the Item enters an error state.

**Gotcha:** there's no re-auth ("Link update mode") flow in this repo yet. If an Item breaks (`ITEM_LOGIN_REQUIRED`, expired MFA, etc.), the fix today is re-running `npm run plaid:link` for that institution from scratch, which overwrites its entry in `access_tokens.json`.

---

## Key Endpoints in Use

| Endpoint (SDK method) | Used in | Purpose | Notes |
|---|---|---|---|
| `/link/token/create` (`linkTokenCreate`) | `link.js` | Starts a Link session | Re-created on every page load of the local link server |
| `/item/public_token/exchange` (`itemPublicTokenExchange`) | `link.js` | Converts short-lived `public_token` into permanent `access_token` | One-time per institution |
| `/accounts/balance/get` (`accountsBalanceGet`) | `sync.js` | Current + available balances per account | Uses `available` for depository accounts, falls back to `current` |
| `/transactions/get` (`transactionsGet`) | `sync.js` | Transactions in a date range (hardcoded 30-day lookback, `count: 100`, no pagination past first page) | **See gotcha below — this endpoint is the legacy approach** |

### Gotcha: `/transactions/get` vs `/transactions/sync`

Plaid's current recommendation (and the direction all new integrations should take) is **`/transactions/sync`**, a cursor-based endpoint that returns added/modified/removed transactions since the last call — no date-range math, no manual reconciliation, no risk of missing a transaction that changed status between calls. `/transactions/get` (what `sync.js` uses today) is the older date-range model and still works, but:

- It re-fetches a fixed 30-day window every run instead of incrementally diffing, so it can silently miss a transaction that was added and then removed (e.g. a pending charge reversed) inside that window between syncs.
- `sync.js` doesn't paginate past `count: 100` — if an institution returns more than 100 transactions in 30 days, older ones in that window are silently dropped from the snapshot.
- Migrating to `/transactions/sync` would fix both issues and is the lower-maintenance long-term path. Not urgent while transaction volume is low, but worth doing before this feeds anything higher-stakes than a dashboard summary.

### Endpoints not yet used *(generic)*

- `/transactions/refresh` — on-demand refresh instead of waiting for Plaid's periodic check (1+ times/day, institution-dependent). Add-on product, may require enabling in the Plaid dashboard.
- `/item/get` — check when an Item was last updated / its error state, useful for surfacing "this account needs re-linking" in the dashboard instead of failing silently.
- `/transactions/recurring/get` — recurring inflow/outflow summary (subscriptions, paycheck detection). Add-on product.

---

## Environments

Set via `PLAID_ENV` in `.env`, mapped through `PlaidEnvironments[...]`:

- **sandbox** — fake data, test institutions (e.g. `ins_109508` / First Platypus Bank), unlimited free use. Good for testing new code paths (like a `/transactions/sync` migration) without touching real accounts.
- **development** *(generic)* — real bank connections, limited number of live Items, historically used before enabling full production billing (Plaid has been folding this tier into Production for many accounts — check current dashboard status if unsure which tier applies).
- **production** — real bank connections, billed per Plaid's subscription/per-request pricing for Transactions.

Check which one is currently set before assuming `plaid:sync` is pulling real account data.

---

## Rate Limits & Gotchas

- Plaid enforces per-endpoint rate limits (returns `RATE_LIMIT_EXCEEDED`); exact numeric ceilings aren't published for all endpoints and can vary by plan. If `plaid:sync` starts erroring with this code, back off with retries (exponential backoff recommended) rather than hammering it — this repo's script does not currently implement retry logic.
- `/transactions/get` and `/transactions/sync` both support a `count` parameter up to 500 per page (default 100). Fewer, larger calls are cheaper against any rate limit than many small ones — worth bumping `count` in `sync.js` regardless of the sync/get migration.
- Transactions data isn't static — pending transactions get finalized, amounts/categories can be corrected after the fact. A 30-day fixed-window re-fetch (current approach) will reflect those corrections eventually, but won't catch a transaction that was added and removed inside the window between two sync runs.
- Institutions refresh on their own schedule (typically 1+ times/day) — polling `plaid:sync` more often than that won't get fresher data unless the Transactions Refresh add-on is enabled.
- `access_tokens.json` is unencrypted at rest and gitignored (`projects/finance/data/`), but lives on disk in plaintext — treat that file like a credential, same tier as `.env`.

---

## Where Things Live

- **Credentials:** `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` in `.env` (gitignored, never committed).
- **Access tokens:** `projects/finance/data/access_tokens.json` (gitignored) — keyed by institution name.
- **Synced data:** `projects/finance/data/snapshot.json` (gitignored) — overwritten on every `plaid:sync` run.
- **Consuming code:** `projects/finance/summary.js` (dashboard finance tab reads through this), `dashboard/server.js` (`/api/sync` shells out to `plaid:sync`).

## Useful Links

- [Plaid Docs — Transactions overview](https://plaid.com/docs/transactions/)
- [Plaid Docs — Transactions Sync migration guide](https://plaid.com/docs/transactions/sync-migration/)
- [Plaid Docs — Rate Limit Exceeded errors](https://plaid.com/docs/errors/rate-limit-exceeded/)
- [Plaid Docs — API reference: Transactions](https://plaid.com/docs/api/products/transactions/)
