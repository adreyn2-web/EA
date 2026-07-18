#!/usr/bin/env python3
"""
Generate a weekly high-protein meal plan using the Claude API.
Reads user preferences from config/user_preferences.json.
Outputs structured JSON to data/meal_plan.json.
"""

import json
import os
import sys
import time
from datetime import date, timedelta
from pathlib import Path

import anthropic
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent))
import track
import inventory

ROOT = Path(__file__).parent.parent
COMPASS_ROOT = ROOT.parent.parent
load_dotenv(COMPASS_ROOT / ".env")

CONFIG_PATH = ROOT / "config" / "user_preferences.json"
DATA_DIR = ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)
OUTPUT_PATH = DATA_DIR / "meal_plan.json"

MEAL_PLAN_PROMPT = """You are a sports nutritionist and meal planning expert. Generate a detailed weekly meal plan for a person who is bulking (muscle gain phase).

USER PROFILE:
- Current weight: {current_weight} lbs, goal: {goal_weight} lbs by {goal_date}
- Daily calorie target: {calories} kcal
- Daily protein target: {protein}g
- Meals per day: {meals_per_day} ({meal_structure})
- Dietary restrictions: {restrictions}
- Disliked foods: {dislikes}
- Cooking skill: {skill_level}
- Cuisine variety requested: yes — mix cuisines across the week

FEEDBACK FROM LAST WEEK (avoid low-rated, repeat high-rated occasionally):
{feedback}

CURRENT INVENTORY (fridge/pantry — use what's on hand before buying more; never plan to cook
with anything marked EXPIRED):
{inventory_section}

REQUIREMENTS:
- 7 days, each with: breakfast, lunch, dinner, snack_1, snack_2
- Each meal must include: recipe_name, ingredients (with quantities in standard US units), macros (protein_g, carbs_g, fat_g, calories), estimated_cost_usd, prep_time_minutes
- Vary proteins heavily: chicken, beef, salmon, tuna, eggs, Greek yogurt, cottage cheese, turkey, shrimp, pork, bison, etc.
- Every meal must be cooked fresh at the time it is eaten. Never plan a dish to be batch-cooked once in a large quantity and reheated across multiple days — this person dislikes meal-prepped/reheated food. Prepping raw ingredients ahead of time (chopping, marinating, portioning, pre-cooking a simple base component like a pot of rice) is encouraged for speed, but the finished dish itself must be cooked fresh, per meal, right before it's eaten. Target roughly 15-25 minutes of active fresh-cook time per meal given this person's advanced skill level and busy schedule.
- Efficiency and low waste: favor reusing the same core proteins and produce across multiple meals in the week (e.g. a protein bought for one meal should reappear later in the week in a different recipe) rather than single-use ingredients bought for only one meal — this controls grocery cost and avoids buying things that spoil unused. Use CURRENT INVENTORY items first (especially anything flagged "use this first") before adding overlapping new items to the grocery list.
- No meal should repeat in the same week
- Grocery list: aggregate only NEW ingredients that still need to be purchased after accounting for CURRENT INVENTORY, organized by category

Respond ONLY with a valid JSON object matching this exact structure:
{{
  "week_of": "YYYY-MM-DD",
  "macro_targets": {{
    "calories": 3100,
    "protein_g": 175,
    "carbs_g": 350,
    "fat_g": 100
  }},
  "days": [
    {{
      "day": "Monday",
      "meals": [
        {{
          "meal_type": "breakfast",
          "recipe_name": "...",
          "ingredients": [
            {{"item": "...", "quantity": "...", "unit": "..."}}
          ],
          "macros": {{"protein_g": 0, "carbs_g": 0, "fat_g": 0, "calories": 0}},
          "estimated_cost_usd": 0.00,
          "prep_time_minutes": 0,
          "prep_ahead_note": ""
        }}
      ],
      "daily_totals": {{"protein_g": 0, "carbs_g": 0, "fat_g": 0, "calories": 0, "estimated_cost_usd": 0.00}}
    }}
  ],
  "grocery_list": {{
    "proteins": [{{"item": "...", "quantity": "...", "unit": "...", "estimated_cost_usd": 0.00}}],
    "produce": [],
    "dairy": [],
    "grains": [],
    "pantry": [],
    "frozen": [],
    "other": []
  }},
  "used_from_inventory": [{{"item": "...", "quantity": "...", "unit": "..."}}],
  "estimated_weekly_cost_usd": 0.00
}}"""


def load_config():
    with open(CONFIG_PATH) as f:
        return json.load(f)


def load_feedback():
    return track.feedback_summary_for_prompt()


def load_inventory_section():
    items = inventory.with_status(inventory.load())
    if not items:
        return "No inventory tracked — assume fridge/pantry is empty; all ingredients must be purchased."

    items.sort(key=lambda i: i.get("expires_on") or "9999-99-99")
    lines = []
    for i in items:
        tag = ""
        if i["status"] == "expired":
            tag = " (EXPIRED — do NOT use in any recipe; assume this will be discarded)"
        elif i["status"] == "expiring_soon":
            tag = " (expiring soon — use this first)"
        lines.append(f"- {i.get('quantity','')} {i.get('unit','')} {i['item']} [{i['category']}]{tag}")
    return "\n".join(lines)


def get_week_start():
    today = date.today()
    # Next Monday (or today if Monday)
    days_ahead = 0 - today.weekday()
    if days_ahead < 0:
        days_ahead += 7
    return (today + timedelta(days=days_ahead)).isoformat()


def generate_meal_plan(config: dict, feedback: str, retry: bool = False) -> dict:
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    profile = config["profile"]
    nutrition = config["nutrition_targets"]
    prefs = config["preferences"]

    prompt = MEAL_PLAN_PROMPT.format(
        current_weight=profile["current_weight_lbs"],
        goal_weight=profile["goal_weight_lbs"],
        goal_date=profile["goal_date"],
        calories=nutrition["calories_per_day"],
        protein=nutrition["protein_g_per_day"],
        meals_per_day=nutrition["meals_per_day"],
        meal_structure=", ".join(nutrition["meal_structure"]),
        restrictions=", ".join(prefs["dietary_restrictions"]) or "none",
        dislikes=", ".join(prefs["disliked_foods"]) or "none",
        skill_level=prefs["skill_level"],
        feedback=feedback,
        inventory_section=load_inventory_section(),
    )

    system = "You are a precise JSON-outputting meal planning API. Output only valid JSON, no prose, no markdown fences."

    raw = ""
    with client.messages.stream(
        model="claude-opus-4-8",
        max_tokens=32000,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for text in stream.text_stream:
            raw += text
    raw = raw.strip()

    # Strip markdown fences if model adds them despite instructions
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        plan = json.loads(raw)
    except json.JSONDecodeError as e:
        if not retry:
            print(f"JSON parse error on first attempt: {e}. Retrying...")
            time.sleep(3)
            return generate_meal_plan(config, feedback, retry=True)
        print(f"Fatal: could not parse Claude response as JSON after retry.\n{e}")
        sys.exit(1)

    # Stamp the week
    plan["week_of"] = get_week_start()
    return plan


def main():
    print("Loading config...")
    config = load_config()

    print("Loading feedback...")
    feedback = load_feedback()
    print(f"Feedback: {feedback[:80]}...")

    # Guard: don't regenerate if already done this week
    if OUTPUT_PATH.exists():
        with open(OUTPUT_PATH) as f:
            existing = json.load(f)
        if existing.get("week_of") == get_week_start():
            print(f"Meal plan for week of {get_week_start()} already exists. Skipping generation.")
            print(f"Delete {OUTPUT_PATH} to force regeneration.")
            return

    print("Calling Claude API to generate meal plan (this may take 30–60 seconds)...")
    plan = generate_meal_plan(config, feedback)

    with open(OUTPUT_PATH, "w") as f:
        json.dump(plan, f, indent=2)

    total_cost = plan.get("estimated_weekly_cost_usd", 0)
    days = len(plan.get("days", []))
    print(f"Meal plan generated: {days} days, estimated weekly cost ${total_cost:.2f}")
    print(f"Saved to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
