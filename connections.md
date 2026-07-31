# Connections Registry

**Last updated:** 2026-07-31

Every external tool/service Compass can reach, how it's reached, current status, and where its
credentials/data live. Update this whenever a connection is added, breaks, goes dormant, or gets
revived — this is the one place to check "what's actually live right now" without grepping `.env`
and every project folder.

Status legend: **live** (in active regular use) · **dormant** (configured but not currently used)
· **broken** (configured but failing) · **read-only** / **read-write** (capability)

---

## Financial Data

### Plaid
- **Status:** live — read-only
- **Mechanism:** Node SDK (`plaid@^26.0.0`) via `projects/finance/plaid/link.js` (one-time OAuth)
  and `sync.js` (recurring pull)
- **Credentials:** `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` in `.env`
- **Last activity:** `snapshot.json` last written 2026-07-30 (via `npm run plaid:sync`)
- **Reference:** `references/plaid-api.md`
- **Notes:** Only `Products.Transactions` enabled. Uses legacy `/transactions/get` — see gotcha
  in the reference doc about migrating to `/transactions/sync`.

### Schwab
- **Status:** dormant — read-only (not yet connected)
- **Mechanism:** none implemented — `.env` has `SCHWAB_APP_KEY` / `SCHWAB_APP_SECRET` as
  placeholders ("fill in after developer account approval"); `projects/finance/schwab/` exists as
  an empty directory
- **Credentials:** placeholders only, not populated
- **Last activity:** directory created mid-June 2026, untouched since — no token/data files exist
- **Reference:** none yet — write `references/schwab-api.md` when this gets built out
- **Notes:** Dormant is expected/intentional, not a bug — day trading is paused while the AIOS
  build is the anchor project (see `context/current-priorities.md`). Revisit when trading bot
  work resumes.

### Apple Card (manual import)
- **Status:** live but disconnected downstream — read-only
- **Mechanism:** manual CSV export → `npm run apple:import <csv> <balance>` →
  `projects/finance/apple-card/import.js` → `projects/finance/data/apple_card.json`
- **Credentials:** none (manual file import, no API)
- **Last activity:** `apple_card.json` last written 2026-06-12
- **Notes:** Dead-end data path — nothing downstream (dashboard, summary.js) currently reads this
  file. Either wire it in or note it as intentionally parallel/manual-only.

---

## Communication

### Gmail (delivery via app password)
- **Status:** dormant/unconfirmed — write-only (email send)
- **Mechanism:** SMTP via `GMAIL_APP_PASSWORD` in `projects/meal-plan/tools/send_email.py`, used
  by the weekly meal-plan cron to send the generated PDF
- **Credentials:** `GMAIL_APP_PASSWORD` in `.env` (also expected as a GitHub Actions secret for
  the cron job)
- **Last activity:** unconfirmed whether the app password is currently set — `send_email.py`
  falls back to saving the PDF locally and printing a reminder if it's missing
- **Notes:** Separate from Google Workspace/`gws` below — this is a plain SMTP app-password path
  used only by the meal-plan pipeline.

### Google Workspace (`gws` CLI)
- **Status:** live — read-write
- **Mechanism:** `gws` CLI, authenticated as `adreynf@perspectiveautomation.com`; wraps Gmail,
  Calendar, Drive, Sheets, Docs, Slides, Tasks
- **Credentials:** OAuth via `gws` CLI's own auth flow (not in `.env`)
- **Skills:** `gws-gmail*`, `gws-calendar*`, `gws-drive*`, `gws-sheets*`, `gws-docs*`,
  `gws-slides`, `gws-tasks` (20 skills total, see `references/sops/skills-guide.md`)
- **Notes:** Authenticated under the `perspectiveautomation.com` work identity, not
  `adreyn2@gmail.com` — worth remembering when a task implies "my personal inbox/calendar" vs.
  the freelance/business one.

---

## AI / Compute

### Anthropic API
- **Status:** live — read-write (generates content)
- **Mechanism:** direct API calls from `projects/_shared/common.py`, used by
  `projects/meal-plan/tools/generate_meal_plan.py` (and available to health/journal tools per
  `docs/CODEBASE_MAP.md`)
- **Credentials:** `ANTHROPIC_API_KEY` in `.env`, mirrored as a GitHub Actions secret for the
  weekly meal-plan cron (`.github/workflows/weekly_meal_plan.yml`)
- **Last activity:** runs weekly via cron (Sundays, 1pm UTC)
- **Reference:** none yet — low priority since this is a stable, well-documented public API and
  usage here is simple (single-shot generation calls)

---

## Infrastructure

### ngrok tunnel
- **Status:** live (used when exposing dashboard remotely) — n/a (infra, not data)
- **Mechanism:** `npm run tunnel` → static domain via `NGROK_DOMAIN` in `.env`
- **Credentials:** `NGROK_DOMAIN` in `.env`; dashboard auth gated separately by `DASHBOARD_USER`
  / `DASHBOARD_PASS`
- **Notes:** Only relevant when the dashboard needs to be reached outside localhost.

---

## Gaps / Not Yet Connected

- No reference guide for Schwab (not built yet — expected, see Schwab entry above)
- No reference guide for Gmail/Calendar/Drive via `gws` — the CLI's own docs may cover this
  sufficiently; consider a `references/gws-cli.md` if skills keep re-deriving the same CLI syntax
- Apple Card CSV import has no automated pipeline (manual, occasional)
