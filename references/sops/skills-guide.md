# Skills Guide — What You Have and When to Use It

Your cheat sheet for every skill installed in Compass. Skills are just pre-written workflows —
say the trigger phrase (or something close to it) and Claude follows that playbook instead of
improvising. You don't need to memorize exact names; a natural request usually triggers the
right one.

---

## 1. Your Custom Skills (built for you specifically)

These live in `.claude/skills/` and were written for your exact goals — debt-free by Dec 2026,
145→175 lbs bulk, the trading bot, etc.

### finance-tracker
**Use for:** monthly review, logging a payment/expense, checking debt payoff progress, deciding
where a surplus should go.
**Example:** "Do my monthly finance review" or "I just paid $200 extra on the credit card, log it."
**Saves to:** `references/finance/` (log, debt tracker, monthly reviews).

### meal-planner
**Use for:** building next week's meals, need new food ideas, want a grocery list.
**Example:** "Plan my meals for next week, not much time to cook, $80 budget."
**Saves to:** `references/meal-plans/YYYY-MM-DD.md`. Automatically pulls in `culinary-procedure`
rules (below) when it schedules prep.

### culinary-procedure
**Use for:** not something you invoke directly — it's reference knowledge Claude applies
whenever prep timing, batch cooking, or "can I make this ahead" comes up (in meal planning or in
chat).
**Example:** "Can I meal-prep the chicken marinade Sunday for Thursday's dinner?" → it'll tell
you that's too long for a fridge marinade and suggest freezing instead.

### workout-planner
**Use for:** building the week's training split, need variety, coming back from a rest period.
**Example:** "Build this week's workout, I can train 4 days, shoulders are a little sore."
**Saves to:** `references/workouts/YYYY-MM-DD.md`.

### trade-journal
**Use for:** logging a trade after you close it, or logging the whole day at session's end.
Surfaces patterns once you've got 3+ logged trades (e.g., "you keep cutting winners early").
**Example:** "Log today's trade: long TSLA, in at 245, out at 251..."
**Saves to:** `projects/trading-bot/journal/YYYY-MM.md`.

### research-routine
**Use for:** learning a trading concept/strategy, researching a business idea, anything feeding
financial literacy or long-term growth. Always uses live web search, never answers from memory
alone (things like platforms/pricing/best practices go stale).
**Example:** "Research routine on options theta decay, quick hit" or "...deep dive."
**Saves to:** `projects/trading-bot/research/` (trading) or `references/research/` (everything
else).

### personal-journal
**Use for:** not something you ask for by name — it activates when you're actually
processing something (a hard shift, motivation, stress) whether or not you call it "journaling."
Captures your words verbatim, engages like a mentor, only promotes real recurring patterns into
memory. Not therapy — it'll say so if something bigger comes up.
**Example:** just talk about what's on your mind; no special phrasing needed.
**Saves to:** `projects/journal/data/entries.json` (gitignored — most private data in the repo).

---

## 2. Meta Skills (they maintain the system itself)

### audit
**Use for:** "is my AIOS actually working" — scores this whole setup (Context, Connections,
Capabilities, Cadence) out of 100 and gives you the top 3 highest-leverage fixes.
**Example:** "Audit my setup" or "score my AIOS."
**Good habit:** run it now for a baseline, then weekly to watch the score climb.

### cartographer
**Use for:** regenerating `docs/CODEBASE_MAP.md` after you've made structural changes to the
repo — new folders, new projects, big refactors.
**Example:** `/cartographer`

### skill-updates
**Use for:** checking whether any *installed* skill (the `gws-*` ones, tracked in
`skills-lock.json`) changed upstream. Runs daily on a schedule already; you can also trigger it
manually. Never applies an update without you approving it first.
**Example:** "Any updates to my skills?"

### repo-finder
**Use for:** before installing any new tool/library/CLI — compares real options live instead of
grabbing the first search result. This is how `gws` itself got chosen.
**Example:** "Find me a good CLI for tracking crypto prices."

---

## 3. Google Workspace Skills (`gws-*`) — 20 skills, all just installed

These all wrap one CLI (`gws`, authenticated as adreynf@perspectiveautomation.com). You don't
need to learn 20 different tools — just ask in plain English and the right one fires.

| Skill | Use for | Example |
|---|---|---|
| `gws-gmail-triage` | Quick unread inbox summary | "What's in my inbox?" |
| `gws-gmail-read` | Pull the body/headers of one message | "Read that email from the landlord." |
| `gws-gmail-send` | Send a new email | "Email my manager asking to swap Friday's shift." |
| `gws-gmail-reply` / `gws-gmail-reply-all` | Reply in-thread (handles threading for you) | "Reply to that thread and say I'm in." |
| `gws-gmail-forward` | Forward a message | "Forward that receipt to my accountant." |
| `gws-gmail` | Anything broader than the above (search, labels, drafts) | "Find all emails from DoorDash this month." |
| `gws-calendar-agenda` | Upcoming events across all calendars | "What's on my calendar this week?" |
| `gws-calendar-insert` | Create a new event | "Add a dentist appointment Thursday 2pm." |
| `gws-calendar` | Anything broader (manage calendars, edit/delete events) | "Move my Tuesday shift to Wednesday." |
| `gws-docs-write` | Append text to a Google Doc | "Add this paragraph to my business plan doc." |
| `gws-docs` | Read a doc, or anything beyond simple append | "Pull the latest draft of my SOP doc." |
| `gws-sheets-read` | Read values from a spreadsheet | "What's in row 12 of my expense sheet?" |
| `gws-sheets-append` | Append a row | "Add this trade to my trading log sheet." |
| `gws-sheets` | Anything broader (formulas, multiple ranges, formatting) | "Pull my whole budget sheet and summarize it." |
| `gws-drive-upload` | Upload a file with auto metadata | "Upload this file to Drive." |
| `gws-drive` | Manage files/folders/shared drives | "Find my tax documents folder." |
| `gws-slides` | Read/write a presentation | "Add a slide summarizing Q3 goals." |
| `gws-tasks` | Manage Google Tasks lists | "Add 'renew car registration' to my tasks." |
| `gws-shared` | Not user-facing — shared auth/CLI reference the other gws skills lean on | n/a |

**Rule of thumb:** if it involves email, your calendar, a doc/sheet/slide, or a Drive file — just
ask naturally. You don't need to know the skill name.

---

## 4. Built-In Process Skills (trigger automatically, rarely invoked by name)

These come from the harness itself, not something specific to Compass. You'll rarely need to
name them — they're listed here so you recognize *why* Claude suddenly starts brainstorming or
writing a plan instead of just doing the thing.

| Skill | What it changes | When it kicks in |
|---|---|---|
| `superpowers:brainstorming` | Explores intent/requirements before building anything | Any "let's build X" request, before implementation starts |
| `superpowers:writing-plans` / `executing-plans` | Turns a spec into a step-by-step plan, then executes it with checkpoints | Multi-step tasks with real requirements |
| `superpowers:systematic-debugging` | Structured root-cause approach instead of guessing fixes | Any bug report or unexpected behavior |
| `superpowers:test-driven-development` | Writes tests before implementation | Any new feature or bugfix in code |
| `superpowers:requesting-code-review` / `receiving-code-review` | Review checkpoints before/after merging | Finishing a feature, before merging |
| `superpowers:verification-before-completion` | Forces running actual verification commands before saying "done" | Any claim that something is fixed/working/passing |
| `superpowers:finishing-a-development-branch` | Decides how to integrate finished work (merge, PR, etc.) | End of implementation work |

## 5. Other Utility Skills Worth Knowing About

- **`run`** — actually launches your app/dashboard so a change can be seen working, not just
  tested. Ask: "run the dashboard and check the finance page."
- **`security-review`** — reviews pending code changes for security issues before you ship.
- **`update-config`** — edits `settings.json` for permissions, hooks, env vars ("allow npm
  commands without asking every time").
- **`dataviz`** / **`frontend-design`** — kick in automatically any time a chart or new UI is
  being built in the dashboard, so it doesn't look like a default/templated chart or page.
- **`claude-api`** — reference for building anything that calls the Claude/Anthropic API
  directly (relevant if the trading bot ever calls Claude programmatically).
- **`schedule`** / **`loop`** — set up recurring cloud routines ("run my finance review every
  Sunday") or repeat a task on an interval.

---

## How to Actually Use This

You almost never need to say a skill's exact name. Just describe what you want in plain language
— "plan my meals," "log this trade," "what's in my inbox" — and the right skill fires on its
own. This list exists so that when you're not sure Compass *can* do something, you can scan it
first instead of assuming it can't.
