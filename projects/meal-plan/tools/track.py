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
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
DATA_DIR = ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)
TRACKER_PATH = DATA_DIR / "tracker.json"


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
        sys.exit(1)

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
