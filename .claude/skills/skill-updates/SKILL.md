# Skill: Skill Updates

Check whether any skill installed via the `skills` CLI (tracked in `skills-lock.json` at the repo
root) has changed upstream, and flag it for review — never apply changes silently.

## When to use
- A scheduled recurring check (daily, via a `schedule` cloud routine)
- Adreyn asks "any updates to my skills/repos?" or similar
- Before relying on a skill for something important, if it's been a while since it was checked

## Why this exists
Installing a skill from a repo (e.g. `gws-*` from `googleworkspace/cli`) creates no ongoing
connection to that source — nothing gets noticed automatically unless this workflow runs.
Separately: `npx skills update --help` was tried once and it turned out `--help` isn't recognized
by the `update` subcommand — it silently ran a real update instead of printing help text. Assume
any invocation of `skills update` is live, not a dry run.

## Workflow

**Step 1 — Run the update**
```bash
npx skills update
```
This mutates files under `.agents/skills/` in place. That's fine — nothing is committed
automatically, and git is the safety net (see below).

**Step 2 — Check what actually changed**
```bash
git status --short -- .agents/ .claude/skills/ skills-lock.json
git diff --stat -- .agents/ .claude/skills/ skills-lock.json
```
- Nothing listed → report "up to date, nothing changed" and stop. Don't touch git further.
- Something listed → continue to Step 3.

**Step 3 — Summarize for review**
Read the actual diff (`git diff -- .agents/ .claude/skills/ skills-lock.json`), not just the stat
line. Summarize which skills changed and what changed about them in plain language — a new
recipe, a reworded instruction, a fixed bug in an example, etc. Report this to Adreyn.

**Step 4 — Wait for a decision. Never commit automatically.**
- Accept → commit it (normal commit flow, ask first per this project's standing rule).
- Reject → discard with `git checkout -- .agents/ .claude/skills/ skills-lock.json` (or
  `git restore` — same effect) to stay pinned to the current version.

## Output Format
Lead with the answer: "up to date" or "N skills changed." If there are changes, list them with a
one-line description each, then stop and wait — don't commit, don't discard, just report.
