# Skill: Culinary Prep Procedure

Food-safety and prep-efficiency knowledge for deciding when advance prep should actually happen —
not just what to prep. Read by the meal-plan generator
(`projects/meal-plan/tools/generate_meal_plan.py`) on every generation, and applicable any time
Claude is asked about batch cooking, freezer strategy, or "can I prep this ahead" questions in
chat.

## When to use
- Meal plan generation deciding a `prep_day` for a prep-ahead task
- Any in-chat question about prepping, batch cooking, or freezer strategy
- Recipe/technique questions involving dough, marinades, or make-ahead components

## Core rules

### Freezer vs. fridge is the main lever
- **Freezer-safe components can be front-loaded early in the week** (even the person's day off,
  if that's early in the week) because freezing pauses the spoilage/quality clock entirely. The
  correct pattern is two-stage: (1) make + freeze early, (2) thaw / bring to room temp / finish
  (proof, bake, etc.) the day of or morning of eating. Doughs, some sauces, pre-formed patties or
  portions, and par-baked items usually freeze well.
- **Fridge-only prep has a real, much shorter clock** and must be scheduled close to when it's
  eaten, not batched to the start of the week. Soaked oats/chia, marinated proteins, chopped
  produce, and dressed salads all degrade within a few days at most in the fridge.

### Typical windows (defaults — use judgment per specific recipe)
- Overnight oats/chia: soak the night before eating; not more than ~2 nights ahead in the fridge.
- Marinades (acid/dairy-based): 12–24 hours ahead; longer can start breaking down texture.
- Chopped raw produce: 1–2 days ahead in the fridge.
- Cooked grain/rice bases: 3–4 days ahead in the fridge; freeze if needed further out.
- Bread/pizza dough — two valid strategies:
  - Cold ferment in the fridge: start however many days ahead the recipe genuinely needs (often
    1–3), pull and bring to room temp / shape the day it's used.
  - Make ahead and freeze: shape/portion the dough early in the week, freeze, then thaw (fridge
    overnight or room temp same-day depending on size) and proof/bake the day it's used.
- Batch-cooked proteins meant to be reheated as a finished dish: avoid — a base component (rice, a
  sauce) can be batch-cooked, but the final dish should still be cooked fresh per meal.

### The rule that matters most
Never schedule prep earlier than what's food-safe/quality-safe for that specific technique, and
never later than needed to save real time. Default to closer to the day of eating unless freezing
is explicitly part of the plan — freezing is the only thing that justifies front-loading prep to
early in the week for something eaten days later.

## Default assumptions for this kitchen

- **Proteins are stored frozen by default.** Unless a protein is explicitly on hand as fresh/
  refrigerated inventory, assume every meat/fish/poultry item for the week is coming out of the
  freezer. Every meat-based meal needs its own thaw prep_task — don't let a recipe just show up
  ready to cook with no thaw step. Typical guidance: fridge-thaw roughly 24 hours ahead for a
  meal-sized portion (larger cuts need longer — about 24 hours per 4-5 lbs), or a same-day sealed
  cold-water-bath thaw (submerged, change the water every 30 minutes) if there wasn't enough
  fridge lead time. State which method and when in the instructions (e.g. "move from freezer to
  fridge Wednesday night for Friday's dinner" or "cold-water thaw Friday morning, ~45 min").
- **Flour-based staples are homemade by default — except pasta.** Bread, tortillas, buns, wraps,
  pizza dough, and similar flour-based components should be planned as full made-from-scratch
  recipes — their own ingredients, recipe_steps, and prep_tasks (mixing, kneading, proofing/
  resting, baking/cooking) — not listed as a grocery item to simply buy. **Pasta is the one
  exception: always buy it store-bought, never plan homemade pasta dough**, since this person
  hasn't done that before. Only treat any other flour staple as store-bought if told otherwise for
  that specific week.

## Used by
- `projects/meal-plan/tools/generate_meal_plan.py` — injects this file's contents into the weekly
  generation prompt so every plan applies the same procedure. Update this file (not the prompt
  string) when the underlying culinary knowledge needs to change.
