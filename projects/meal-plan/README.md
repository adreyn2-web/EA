# Meal Plan

Weekly high-protein meal planning for the 145 → 175 lbs bulk. Generates a 7-day plan + grocery
list via the Claude API, builds a PDF, emails it, and tracks actual spend/ratings locally so the
next week's plan can learn from the last one.

Merged in from a standalone WAT-framework prototype (`~/Desktop/sink`) that had been running on
its own GitHub Actions cron since 2026-06-08. The Google Sheets tracking half of that prototype
never actually worked (missing OAuth credentials on the Actions runner), so it's been replaced
here with a local JSON tracker fed straight from the Compass dashboard.

Every meal is cooked fresh at the time it's eaten — never a big batch cooked once and reheated
across the week. Ingredient prep ahead of time (chopping, marinating, portioning, pre-cooking a
simple base like rice) is fine and expected; the finished dish itself is always cooked fresh,
targeting ~15–25 min active cook time per meal. The plan also checks current fridge/pantry
inventory first and only puts genuinely new items on the grocery list, favoring ingredients that
get reused across multiple meals in the week to keep cost and waste down.

## Modules
| File | Purpose |
|------|---------|
| `tools/generate_meal_plan.py` | Calls Claude, writes `data/meal_plan.json` |
| `tools/generate_pdf.py` | Builds `data/meal_plan_YYYY-MM-DD.pdf` from the JSON |
| `tools/send_email.py` | Emails the PDF via Gmail SMTP (app password, no OAuth) |
| `tools/track.py` | Reads/writes `data/tracker.json` — actual cost, rating, notes per week |
| `tools/inventory.py` | Reads/writes `data/inventory.json` — fridge/pantry stock |
| `config/user_preferences.json` | Profile, macro targets, meal structure |

`data/` is gitignored, same as `projects/finance/data/`.

## Inventory
Update it in plain language from the dashboard ("used the chicken thighs, milk went bad, grabbed
a dozen eggs") — `inventory.py update "<text>"` sends the current inventory + that text to Claude,
which returns a small delta (`{"additions": [...], "removals": [...]}`), never the whole list, so
a bad model response can only affect one entry, not silently rewrite everything on hand.
Expiration status (`fresh` / `expiring_soon` / `expired`) is never stored — it's always computed
live from `expires_on`, so it can't go stale. Nothing is auto-decremented from the generated
plan's `used_from_inventory` field; removing items is always an explicit action (the free-text
update, or a Used/Toss button in the dashboard).

## Running it
```
npm run meal:generate
```
Chains generate → PDF → email. Skips regeneration if this week's plan already exists
(delete `data/meal_plan.json` to force a rerun).

## Dashboard
Surfaced in the Compass dashboard under **More → Health**: this week's macros vs. targets,
grocery list, estimated cost, a "Generate This Week" button, and a form to log actual cost +
rating (writes to `data/tracker.json` via `tools/track.py`).

## Automation
Runs every Sunday 8am via GitHub Actions (`.github/workflows/weekly_meal_plan.yml`), which commits
the generated `data/` files back to `main` so a `git pull` brings the week's plan into the local
dashboard. Requires `ANTHROPIC_API_KEY` and `GMAIL_APP_PASSWORD` as repo secrets.
