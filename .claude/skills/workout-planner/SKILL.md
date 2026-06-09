# Skill: Workout Planner

Build a training week optimized for lean mass gain.

## When to use
- Weekly workout planning
- Need a new split or more variety
- Coming off a rest period and need a fresh start

## Context
- Goal: gain lean mass (145 → 175 lbs)
- Level: intermediate beginner — knows the basics, building consistency
- Priority: progressive overload, compound lifts first, recovery matters
- Schedule: flexible around restaurant shift work

## Workflow

**Step 1 — Check in**
Ask:
- How many days can you train this week?
- Any soreness, injuries, or muscle groups to avoid?
- Any specific focus this week? (e.g., "want to hit back harder")

**Step 2 — Build the plan**
Generate the week's training:
- Assign muscle groups to each day with logic (e.g., push/pull/legs or upper/lower)
- List exercises with sets, reps, and rest periods
- Lead with compound lifts, follow with accessories
- Include one cardio or active recovery day if schedule allows
- Give one progressive overload cue for the week (e.g., "add 5 lbs to bench from last week")

**Step 3 — Save**
Write the plan to `references/workouts/YYYY-MM-DD.md`.

## Output Format
Day-by-day. Each exercise on its own line: **Exercise | Sets x Reps | Rest**. Clean and scannable.
