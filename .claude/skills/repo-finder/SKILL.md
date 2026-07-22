# Skill: Repo Finder

Find the right repo/tool for a stated need — not just the first search result.

## When to use
- "Find me a good CLI/library/tool for X"
- "Is there a repo for Y?"
- Before installing something new, to compare options rather than grabbing the first hit

## Workflow

**Step 1 — Clarify the need**
Ask (briefly, only what's actually ambiguous):
- What functionality, specifically?
- Any language/ecosystem constraint?
- Official/vendor-maintained required, or is a solid community project fine?
- Does it need to be actively maintained, or is a stable-but-quiet project okay?

**Step 2 — Search live**
Use WebSearch and/or `gh search repos` — never recommend from memory. A repo's popularity,
maintenance status, and whether it's still the best option in its category all go stale fast;
training data is not a substitute for checking right now.

**Step 3 — Evaluate candidates**
For each real contender, check:
- Stars/adoption (rough popularity signal, not the whole story)
- Last commit / release recency — is it actually maintained?
- Open issues/PRs — responsive maintainers vs. abandoned
- License (matters if it'll be used for anything beyond personal scripts)
- Official org vs. random fork/mirror
- README/doc quality — can it actually be figured out from the docs?

**Step 4 — Present a shortlist**
2-4 options, one line of reasoning each, with a clear top pick — never a single unexplained
recommendation.

**Step 5 — Close with one action**
If Adreyn wants to proceed: install it the same way `gws` was set up (npm/brew/binary/cargo,
whatever fits), verify it actually works with a real command, then decide together whether it's
worth registering as a proper Compass skill (`CLAUDE.md` + `.claude/skills/`) or just a one-off
tool.

## Output Format
Lead with the shortlist, not a narrative. One next action at the end.
