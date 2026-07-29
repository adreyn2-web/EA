#!/usr/bin/env python3
"""
General shopping list — food AND household items (cleaner, paper towels, toiletries,
anything you'd pick up at a store). Separate from the fridge/pantry inventory (which tracks
quantities/expiration for what's on hand) and separate from the meal plan's auto-generated
weekly recipe grocery list (which is recipe-driven and regenerates each week).

This list is purely additive from chat: mention you're out of or need something, it gets
added once (deduped case-insensitively) and stays until you check it off after buying it.

Reads/writes projects/meal-plan/data/grocery_list.json:
[
  {"id": "gl_a1b2c3d4", "item": "dish soap", "category": "household", "added_on": "2026-07-18"}
]
"""

from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
COMPASS_ROOT = ROOT.parent.parent
load_dotenv(COMPASS_ROOT / ".env")

sys.path.insert(0, str(COMPASS_ROOT / "projects" / "_shared"))
import common

DATA_DIR = ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)
LIST_PATH = DATA_DIR / "grocery_list.json"

CATEGORIES = ["food", "household"]

UPDATE_PROMPT = """You maintain a general shopping list for a home — food AND non-food items
(cleaning supplies, paper goods, toiletries, anything bought at a store). Given the CURRENT LIST
and a free-text message from the user, return ONLY a JSON object naming NEW items to add — items
the user says they are out of, running low on, or need to buy.

CURRENT LIST:
{current}

USER MESSAGE:
{text}

Rules:
- Only include items the user is clearly describing as out/low/needed. Do not guess.
- Do not include an item that's already on the CURRENT LIST (case-insensitive match on the item
  name) — it's already tracked, skip it.
- Each item: {{"item": "...", "category": "food" or "household"}}.
- This message may come from a general chat assistant, not a dedicated shopping-list form — it
  might not be about groceries or household needs at all (e.g. a question about trading,
  finances, or anything else). If the USER MESSAGE doesn't clearly describe being out of or
  needing to buy something, respond with exactly {{"additions": []}} and nothing else. Do not
  force a match.

Respond ONLY with valid JSON, no prose, no markdown fences:
{{"additions": [...]}}"""


def load() -> list[dict]:
    return common.load_json(LIST_PATH)


def save(items: list[dict]):
    common.save_json(LIST_PATH, items)


def parse_update(current_items: list[dict], free_text: str) -> dict:
    current = "\n".join(f"- {i['item']} [{i['category']}]" for i in current_items) or "(empty)"
    prompt = UPDATE_PROMPT.format(current=current, text=free_text)
    return common.stream_json(
        prompt,
        system="You output only valid JSON deltas for a shopping list. No prose, no markdown fences.",
        max_tokens=1024,
    )


def apply_additions(items: list[dict], additions: list[dict]) -> tuple[list[dict], list[dict]]:
    existing_names = {i["item"].strip().lower() for i in items}
    added = []
    for a in additions:
        name = a.get("item", "").strip()
        if not name or name.lower() in existing_names:
            continue
        item = {
            "id": common.next_id(items + added, "gl"),
            "item": name,
            "category": a.get("category") if a.get("category") in CATEGORIES else "household",
            "added_on": date.today().isoformat(),
        }
        added.append(item)
        existing_names.add(name.lower())
    return items + added, added


def update_from_text(free_text: str) -> dict:
    items = load()
    delta = parse_update(items, free_text)
    updated, added = apply_additions(items, delta.get("additions", []))
    if added:
        save(updated)
    return {"items": updated, "changes": {"added": added}}


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: grocery_list.py list | grocery_list.py update '<text>'"}))
        sys.exit(1)

    cmd = sys.argv[1]
    try:
        if cmd == "list":
            print(json.dumps(load()))
        elif cmd == "update":
            if len(sys.argv) < 3:
                print(json.dumps({"error": "update requires free text"}))
                sys.exit(1)
            print(json.dumps(update_from_text(sys.argv[2])))
        else:
            print(json.dumps({"error": f"Unknown command: {cmd}"}))
            sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
