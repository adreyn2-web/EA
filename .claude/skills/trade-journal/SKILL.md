# Skill: Trade Journal

Log a trade and build your performance record over time.

## When to use
After closing a trade, or at end of a session to log the day's trades.

## Workflow

**Step 1 — Collect trade details**
Ask for:
- Ticker/asset
- Direction (long or short)
- Entry price and time
- Exit price and time
- Position size (shares, contracts, or dollar amount)
- P&L (dollar and %)
- Strategy used (or "undefined" if not yet named)

**Step 2 — Collect reflection**
Ask for:
- Why you entered
- What happened during the trade
- What you did well
- What you'd do differently
- Discipline rating (1–10): did you follow your plan or go rogue?

**Step 3 — Log the trade**
Append to `projects/trading-bot/journal/YYYY-MM.md`.
Create the file if it doesn't exist yet.

**Step 4 — Surface a pattern**
If 3 or more trades exist in the current log, scan recent entries and flag any emerging pattern worth noting (e.g., "You've cut winners early 3 times this week" or "All your losses came from chasing entries").

## Trade Entry Format

```
---
## [YYYY-MM-DD] [TICKER] [LONG/SHORT]

**Entry:** $X.XX at HH:MM CT | **Exit:** $X.XX at HH:MM CT
**Size:** [X shares / $X] | **P&L:** +/-$X.XX (+/-X%)
**Strategy:** [name or brief description]

**Why I entered:** ...
**What happened:** ...
**What I did well:** ...
**What I'd do differently:** ...
**Discipline rating:** X/10
```
