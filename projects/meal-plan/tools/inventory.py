#!/usr/bin/env python3
"""
Fridge/pantry inventory for the meal plan. Adreyn updates it in plain language
("used the chicken thighs, milk went bad, grabbed a dozen eggs") — Claude turns
that into a small delta (additions/removals), and this file applies it. The
model never gets to rewrite the whole inventory, only propose what changed.

Reads/writes projects/meal-plan/data/inventory.json:
[
  {"id": "inv_a1b2c3d4", "item": "chicken thighs", "quantity": "1.5", "unit": "lbs",
   "category": "proteins", "added_on": "2026-07-16", "expires_on": "2026-07-20"}
]

No "status" field is stored — fresh/expiring_soon/expired is always computed live
from expires_on so it can never go stale.
"""

from __future__ import annotations

import json
import os
import sys
import uuid
from datetime import date
from pathlib import Path

import anthropic
from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
COMPASS_ROOT = ROOT.parent.parent
load_dotenv(COMPASS_ROOT / ".env")

DATA_DIR = ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)
INVENTORY_PATH = DATA_DIR / "inventory.json"

CATEGORIES = ["proteins", "produce", "dairy", "grains", "pantry", "frozen", "other"]
LOCATIONS = ["fridge", "freezer", "pantry"]

UPDATE_PROMPT = """You maintain a fridge/pantry inventory for a home cook. Given the CURRENT
INVENTORY and a free-text update from the user, return ONLY a JSON delta describing what changed
— never the full inventory.

CURRENT INVENTORY:
{current}

USER UPDATE:
{text}

Rules:
- "additions": new items the user mentions acquiring. Each: {{"item": "...", "quantity": "...",
  "unit": "...", "category": one of {categories}, "location": one of {locations}, "expires_on":
  "YYYY-MM-DD" or null}}. Infer location from general food knowledge — raw/frozen proteins bought
  in bulk, ice cream, frozen vegetables, anything the user says is going in the freezer → "freezer";
  canned goods, dry goods, spices, shelf-stable staples → "pantry"; everything else (things that
  actually need refrigeration) → "fridge". Only estimate expires_on for "fridge" items, using
  normal food-safety shelf life (e.g. raw chicken ~2 days, milk ~7 days, eggs ~21 days). For
  "freezer" or "pantry" items, leave expires_on null unless the user states an explicit date —
  those don't need close watching. Today's date is {today}.
- "removals": items the user says are used up, gone, or spoiled. Each: {{"id": "...", "item":
  "..."}} where "id" is copied EXACTLY from the matching row in CURRENT INVENTORY. Only remove
  items the user explicitly describes as used/gone/spoiled/thrown out — never guess or remove
  something not mentioned.
- "updates": corrections to an ALREADY-TRACKED item's location/category/expiration — e.g. "the
  salmon is in the freezer, not the fridge", "move the canned tuna to pantry". Each: {{"id": "...",
  "location": "...", "category": "...", "expires_on": "..."}} with "id" copied EXACTLY from the
  matching row in CURRENT INVENTORY and ONLY the fields that are actually changing (omit the
  rest). Use "updates" for correcting/moving something already in the list, never for new
  acquisitions (those are "additions").
- If the user's update doesn't clearly map to an existing row for a removal or update, omit that
  entry rather than guessing an id.
- This message may come from a general chat assistant, not a dedicated inventory form — it might
  not be about food/inventory at all (e.g. a question about trading, finances, or anything else).
  If the USER UPDATE isn't clearly describing fridge/pantry items being acquired, used, gone bad,
  or moved/recategorized, respond with exactly {{"additions": [], "removals": [], "updates": []}}
  and nothing else. Do not force a match.

Respond ONLY with valid JSON, no prose, no markdown fences:
{{"additions": [...], "removals": [...], "updates": [...]}}"""


def load() -> list[dict]:
    if not INVENTORY_PATH.exists():
        return []
    with open(INVENTORY_PATH) as f:
        return json.load(f)


def save(items: list[dict]):
    with open(INVENTORY_PATH, "w") as f:
        json.dump(items, f, indent=2)


def classify_expiration(expires_on: str | None, today: date | None = None) -> str:
    if not expires_on:
        return "fresh"
    today = today or date.today()
    try:
        exp = date.fromisoformat(expires_on)
    except ValueError:
        return "fresh"
    days_left = (exp - today).days
    if days_left < 0:
        return "expired"
    if days_left <= 2:
        return "expiring_soon"
    return "fresh"


def with_status(items: list[dict]) -> list[dict]:
    return [{**i, "status": classify_expiration(i.get("expires_on"))} for i in items]


def next_id(items: list[dict]) -> str:
    existing = {i.get("id") for i in items}
    while True:
        candidate = f"inv_{uuid.uuid4().hex[:8]}"
        if candidate not in existing:
            return candidate


def _strip_fences(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    return raw


def parse_update(current_items: list[dict], free_text: str, retry: bool = False) -> dict:
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    current = "\n".join(
        f"- id={i['id']}: {i.get('quantity','')} {i.get('unit','')} {i['item']} "
        f"[{i['category']}, {i.get('location') or 'unsorted'}]"
        for i in current_items
    ) or "(empty)"

    prompt = UPDATE_PROMPT.format(
        current=current, text=free_text, categories=CATEGORIES, locations=LOCATIONS,
        today=date.today().isoformat(),
    )

    raw = ""
    with client.messages.stream(
        model="claude-opus-4-8",
        max_tokens=4096,
        system="You output only valid JSON deltas for an inventory system. No prose, no markdown fences.",
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for chunk in stream.text_stream:
            raw += chunk

    try:
        return json.loads(_strip_fences(raw))
    except json.JSONDecodeError:
        if not retry:
            return parse_update(current_items, free_text, retry=True)
        raise


def apply_delta(items: list[dict], delta: dict) -> tuple[list[dict], dict]:
    removals = delta.get("removals", [])
    removed_ids = {r["id"] for r in removals if "id" in r}
    kept = [i for i in items if i.get("id") not in removed_ids]
    actually_removed = [i for i in items if i.get("id") in removed_ids]

    additions = delta.get("additions", [])
    added = []
    for a in additions:
        item = {
            "id": next_id(kept + added),
            "item": a.get("item", "unknown"),
            "quantity": a.get("quantity", ""),
            "unit": a.get("unit", ""),
            "category": a.get("category") if a.get("category") in CATEGORIES else "other",
            "location": a.get("location") if a.get("location") in LOCATIONS else None,
            "added_on": date.today().isoformat(),
            "expires_on": a.get("expires_on"),
        }
        added.append(item)

    by_id = {i["id"]: i for i in kept}
    updated_items = []
    for u in delta.get("updates", []):
        item = by_id.get(u.get("id"))
        if not item:
            continue
        if "location" in u and u["location"] in LOCATIONS:
            item["location"] = u["location"]
        if "category" in u and u["category"] in CATEGORIES:
            item["category"] = u["category"]
        if "expires_on" in u:
            item["expires_on"] = u["expires_on"]
        updated_items.append(item)

    updated = kept + added
    summary = {"added": added, "removed": actually_removed, "updated": updated_items}
    return updated, summary


def update_from_text(free_text: str) -> dict:
    items = load()
    delta = parse_update(items, free_text)
    updated, summary = apply_delta(items, delta)
    save(updated)
    return {"items": with_status(updated), "changes": summary}


BACKFILL_PROMPT = """You maintain a fridge/pantry inventory for a home cook. Each of these items
is missing a storage location. Using general food knowledge, assign each one a location: one of
{locations} ("freezer" for raw/frozen proteins, ice cream, frozen vegetables; "pantry" for canned/
dry/shelf-stable goods; "fridge" for everything else that needs refrigeration).

ITEMS:
{items}

Respond ONLY with valid JSON, no prose, no markdown fences:
{{"updates": [{{"id": "...", "location": "..."}}, ...]}}"""


def backfill_locations() -> dict:
    items = load()
    missing = [i for i in items if not i.get("location")]
    if not missing:
        return {"items": with_status(items), "changes": {"added": [], "removed": [], "updated": []}}

    listing = "\n".join(
        f"- id={i['id']}: {i.get('quantity','')} {i.get('unit','')} {i['item']} [{i['category']}]"
        for i in missing
    )
    prompt = BACKFILL_PROMPT.format(locations=LOCATIONS, items=listing)

    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    raw = ""
    with client.messages.stream(
        model="claude-opus-4-8",
        max_tokens=4096,
        system="You output only valid JSON for an inventory system. No prose, no markdown fences.",
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for chunk in stream.text_stream:
            raw += chunk
    delta = json.loads(_strip_fences(raw))

    updated, summary = apply_delta(items, delta)
    save(updated)
    return {"items": with_status(updated), "changes": summary}


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: inventory.py list | inventory.py update '<text>' | inventory.py backfill-locations"}))
        sys.exit(1)

    cmd = sys.argv[1]
    try:
        if cmd == "list":
            print(json.dumps(with_status(load())))
        elif cmd == "update":
            if len(sys.argv) < 3:
                print(json.dumps({"error": "update requires free text"}))
                sys.exit(1)
            print(json.dumps(update_from_text(sys.argv[2])))
        elif cmd == "backfill-locations":
            print(json.dumps(backfill_locations()))
        else:
            print(json.dumps({"error": f"Unknown command: {cmd}"}))
            sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
