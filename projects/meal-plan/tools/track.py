#!/usr/bin/env python3
"""
Local feedback/spend tracker for the meal plan — replaces the Google Sheets
integration, which never actually worked (credentials.json was never present
on the GitHub Actions runner, so every prior run silently fell back).

Reads/writes projects/meal-plan/data/tracker.json:
[
  { "week_of": "2026-07-13", "estimated_cost": 112.5, "actual_cost": 98.2,
    "rating": 4, "notes": "...", "logged_at": "2026-07-20" }
]
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
COMPASS_ROOT = ROOT.parent.parent
DATA_DIR = ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)
TRACKER_PATH = DATA_DIR / "tracker.json"
MEAL_PLAN_PATH = DATA_DIR / "meal_plan.json"

FEEDBACK_UPDATE_PROMPT = """A home cook is chatting with a general assistant, not filling out a
dedicated feedback form. Extract meal-plan feedback from their message, if any is present.

MESSAGE:
{text}

Return ONLY this JSON, no prose, no markdown fences:
{{"actual_cost": <number or null>, "rating": <integer 1-5 or null>, "notes": <short string or null>}}

Rules:
- Only fill a field if the message clearly states it (a dollar amount actually spent on
  groceries this week -> actual_cost; a 1-5 satisfaction/quality rating of this week's meals ->
  rating).
- "notes": ONLY genuine feedback/opinion about how the meals turned out (too much prep time,
  loved the variety, didn't like a specific recipe, etc.) — never logistics like what was
  bought/used/thrown out (that's a separate inventory system, not feedback).
- This message may not be about meal-plan feedback at all (e.g. a question about trading,
  finances, groceries/inventory, or anything else unrelated to how this week's meals actually
  went). If nothing here is genuine meal feedback, return all three fields as null.
- Never guess a number that wasn't stated."""


def load() -> list[dict]:
    if not TRACKER_PATH.exists():
        return []
    with open(TRACKER_PATH) as f:
        return json.load(f)


def save(entries: list[dict]):
    with open(TRACKER_PATH, "w") as f:
        json.dump(entries, f, indent=2)


def record_feedback(week_of: str, estimated_cost: float | None = None,
                     actual_cost: float | None = None, rating: int | None = None,
                     notes: str = "") -> dict:
    from datetime import date

    entries = load()
    entry = next((e for e in entries if e.get("week_of") == week_of), None)
    if entry is None:
        entry = {"week_of": week_of}
        entries.append(entry)

    if estimated_cost is not None:
        entry["estimated_cost"] = estimated_cost
    if actual_cost is not None:
        entry["actual_cost"] = actual_cost
    if rating is not None:
        entry["rating"] = rating
    if notes:
        entry["notes"] = notes
    entry["logged_at"] = date.today().isoformat()

    entries.sort(key=lambda e: e.get("week_of", ""))
    save(entries)
    return entry


def current_week_of() -> str | None:
    if not MEAL_PLAN_PATH.exists():
        return None
    with open(MEAL_PLAN_PATH) as f:
        return json.load(f).get("week_of")


def _strip_fences(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    return raw


def parse_feedback_update(free_text: str, retry: bool = False) -> dict:
    import anthropic
    from dotenv import load_dotenv

    load_dotenv(COMPASS_ROOT / ".env")
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    raw = ""
    with client.messages.stream(
        model="claude-opus-4-8",
        max_tokens=512,
        system="You extract structured meal-feedback fields from chat messages. Output only valid JSON.",
        messages=[{"role": "user", "content": FEEDBACK_UPDATE_PROMPT.format(text=free_text)}],
    ) as stream:
        for chunk in stream.text_stream:
            raw += chunk

    try:
        return json.loads(_strip_fences(raw))
    except json.JSONDecodeError:
        if not retry:
            return parse_feedback_update(free_text, retry=True)
        raise


def update_from_chat(free_text: str) -> dict:
    week_of = current_week_of()
    if not week_of:
        return {"changes": None}

    parsed = parse_feedback_update(free_text)
    actual_cost = parsed.get("actual_cost")
    rating = parsed.get("rating")
    notes = parsed.get("notes")
    if actual_cost is None and rating is None and not notes:
        return {"changes": None}

    record_feedback(week_of, actual_cost=actual_cost, rating=rating, notes=notes or "")
    # Report only what THIS message actually set, not the full merged history —
    # otherwise a message that only adds a note would misleadingly imply it also
    # just set cost/rating if those were already recorded from a prior update.
    return {"changes": {"week_of": week_of, "actual_cost": actual_cost, "rating": rating, "notes": notes}}


def feedback_summary_for_prompt() -> str:
    """Summarize recent history for the meal-plan generation prompt."""
    entries = load()
    if not entries:
        return "No prior feedback available."

    recent = entries[-4:]
    lines = []
    rated = [e for e in recent if e.get("rating") is not None]
    if rated:
        avg_rating = round(sum(e["rating"] for e in rated) / len(rated), 2)
        lines.append(f"Avg rating last {len(rated)} week(s): {avg_rating}/5")
        low = [e["week_of"] for e in rated if e["rating"] <= 2]
        if low:
            lines.append(f"Low-rated week(s) (vary things up): {', '.join(low)}")
    spent = [e for e in recent if e.get("actual_cost") is not None]
    if spent:
        avg_spend = round(sum(e["actual_cost"] for e in spent) / len(spent), 2)
        lines.append(f"Avg actual weekly spend: ${avg_spend:.2f}")
    notes = [e["notes"] for e in recent if e.get("notes")]
    if notes:
        lines.append("Notes: " + " | ".join(notes))

    return "\n".join(lines) if lines else "No prior feedback available."


def main():
    if len(sys.argv) < 2:
        print("Usage: track.py <week_of> [--actual-cost X] [--rating N] [--notes '...']")
        print("   or: track.py chat-update '<free text>'")
        sys.exit(1)

    if sys.argv[1] == "chat-update":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "chat-update requires free text"}))
            sys.exit(1)
        try:
            print(json.dumps(update_from_chat(sys.argv[2])))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
            sys.exit(1)
        return

    week_of = sys.argv[1]
    kwargs = {}
    args = sys.argv[2:]
    i = 0
    while i < len(args):
        if args[i] == "--actual-cost":
            kwargs["actual_cost"] = float(args[i + 1]); i += 2
        elif args[i] == "--rating":
            kwargs["rating"] = int(args[i + 1]); i += 2
        elif args[i] == "--notes":
            kwargs["notes"] = args[i + 1]; i += 2
        else:
            i += 1

    entry = record_feedback(week_of, **kwargs)
    print(f"Logged feedback for week of {week_of}: {entry}")


if __name__ == "__main__":
    main()
