# Memory

Persistent memory for Compass — patterns, preferences, and learnings that should carry across
sessions without re-explaining them. This is separate from `decisions/log.md` (one-off
decisions with reasoning) and `context/` (stable identity/goals docs) — memory is for things
*noticed* over time: recurring behaviors, standing preferences, known gotchas worth remembering
before they bite again.

**How entries get added:** mostly automatic — Claude Code saves patterns here as they emerge
("Remember that I always want X" or a repeated correction). Also fed by `personal-journal`
(only genuine recurring patterns get promoted here, not raw entries) and by structural findings
from `cartographer`/`audit` runs that are worth not re-discovering next time.

Format: `[YYYY-MM-DD] TYPE: description | SOURCE: where this came from`

Types: `PREFERENCE` (how Adreyn wants things done), `PATTERN` (recurring behavior/habit worth
noticing), `GOTCHA` (a known trap in the codebase or a workflow — don't rediscover this the hard
way again), `STATUS` (a standing state worth remembering, like a paused integration).

---

## Preferences

- [2026-07-31] PREFERENCE: Chill mentor / best-friend tone, never corporate. No emojis. Don't
  over-explain — lead with the answer, details only if needed. | SOURCE:
  `.claude/rules/communication-style.md`
- [2026-07-31] PREFERENCE: Research-backed answers only for trading/business/learning topics —
  `research-routine` always uses live web search, never answers from memory alone (things like
  pricing/platforms/best practices go stale). | SOURCE: `references/sops/skills-guide.md`

## Standing Status

- [2026-07-31] STATUS: Schwab integration is dormant — `.env` has `SCHWAB_APP_KEY` /
  `SCHWAB_APP_SECRET` placeholders and `projects/finance/schwab/` exists but is empty; no token
  or data files touched since mid-June. Consistent with day trading being paused while the AIOS
  build is the anchor project. Don't treat Schwab as a live connection until trading resumes. |
  SOURCE: repo audit, 2026-07-31
- [2026-07-31] STATUS: Plaid sync (`projects/finance/plaid/`) is the live, working finance
  connection — `npm run plaid:sync` last ran 2026-07-30. Apple Card import (`apple-card/import.js`)
  is a manual, disconnected side path — nothing downstream reads its output automatically. |
  SOURCE: `docs/CODEBASE_MAP.md`, repo audit 2026-07-31

## Known Gotchas

- [2026-07-31] GOTCHA: Debt baseline (`$7,010.43`) and payoff target date (`2026-12-31`) are
  hardcoded in three separate places — `dashboard/server.js`, `projects/finance/summary.js`, and
  `references/finance/debt-tracker.md` — with no shared source of truth. Updating one without
  the others will silently desync the dashboard from the tracker doc. | SOURCE:
  `docs/CODEBASE_MAP.md` gotchas
- [2026-07-31] GOTCHA: WebAuthn/Face ID on the dashboard is a glance shield only — it blurs
  numbers client-side. `/api/finance` and `/api/trading` still return raw data regardless of
  lock state, so it's not real access control. | SOURCE: `docs/CODEBASE_MAP.md` gotchas
- [2026-07-31] GOTCHA: `projects/finance/plaid/sync.js` uses the legacy `/transactions/get`
  endpoint (fixed 30-day window, no pagination past 100 results) instead of the newer
  `/transactions/sync` cursor-based endpoint Plaid now recommends. Low risk at current
  transaction volume, but can silently drop a transaction that changed state between syncs. |
  SOURCE: `references/plaid-api.md`

## Open Questions / Watch List

- [2026-07-31] PATTERN: No `connections.md` registry existed until this audit pass — worth
  checking whether it's actually being kept current going forward, or whether it goes stale like
  the Apple Card import path did. | SOURCE: repo audit 2026-07-31

---

*Run `consolidate-memory` periodically to merge duplicates, correct stale entries, and keep this
file from becoming an unpruned log.*
