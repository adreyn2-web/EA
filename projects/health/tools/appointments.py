#!/usr/bin/env python3
"""
Medical/dental appointment tracker — freeform text in, structured record out. Mirrors
projects/meal-plan/tools/grocery_list.py's shape: mention an appointment (from the dashboard's
Health tab or in chat) and it gets parsed into a structured entry and appended. Appointments
aren't deduped the way shopping-list items are (two visits to the same provider are both real),
so every parse that finds an appointment just appends it.

Reads/writes projects/health/data/appointments.json:
[
  {"id": "apt_a1b2c3d4", "provider": "Endo PC", "type": "root canal", "date": "2026-07-28",
   "time": "07:30", "location": "1450 28th Street West Des Moines, IA 50266",
   "cost_usd": 2090, "status": "scheduled", "notes": "Cherry financing, 6mo 0% APR, ~$300/mo"}
]
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
LIST_PATH = DATA_DIR / "appointments.json"

STATUSES = ["scheduled", "done", "cancelled"]

UPDATE_PROMPT = """You maintain a medical/dental appointment tracker. Given a free-text message
from the user, extract ONE appointment being described and return it as JSON. Today's date is
{today}, so resolve any relative dates ("next Tuesday", "the 28th") against that.

USER MESSAGE:
{text}

Rules:
- If the message doesn't clearly describe a real appointment (date/provider/reason for a medical
  or dental visit), respond with exactly {{"appointment": null}} and nothing else. Do not force a
  match — this message may not be about an appointment at all.
- provider: the office/clinic/doctor name, or null if not stated.
- type: short description of what it's for (e.g. "root canal", "cleaning", "wisdom tooth
  extraction"), or null if not stated.
- date: ISO format YYYY-MM-DD if a date is given or can be resolved from today's date, else null.
- time: 24-hour HH:MM if given, else null.
- location: address or place name if given, else null.
- cost_usd: a number if a cost is mentioned, else null.
- notes: anything else worth keeping (financing plan, referral source, etc.), or null.

Respond ONLY with valid JSON, no prose, no markdown fences:
{{"appointment": {{"provider": ..., "type": ..., "date": ..., "time": ..., "location": ..., "cost_usd": ..., "notes": ...}}}}"""


def load() -> list[dict]:
    if not LIST_PATH.exists():
        return []
    with open(LIST_PATH) as f:
        return json.load(f)


def save(items: list[dict]):
    with open(LIST_PATH, "w") as f:
        json.dump(items, f, indent=2)


def next_id(items: list[dict]) -> str:
    existing = {i.get("id") for i in items}
    while True:
        candidate = f"apt_{uuid.uuid4().hex[:8]}"
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


def parse_update(free_text: str, retry: bool = False) -> dict:
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    prompt = UPDATE_PROMPT.format(today=date.today().isoformat(), text=free_text)

    raw = ""
    with client.messages.stream(
        model="claude-opus-4-8",
        max_tokens=1024,
        system="You output only valid JSON for an appointment tracker. No prose, no markdown fences.",
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for chunk in stream.text_stream:
            raw += chunk

    try:
        return json.loads(_strip_fences(raw))
    except json.JSONDecodeError:
        if not retry:
            return parse_update(free_text, retry=True)
        raise


def update_from_text(free_text: str) -> dict:
    items = load()
    delta = parse_update(free_text)
    appt = delta.get("appointment")
    if not appt:
        return {"items": items, "changes": {"added": []}}

    entry = {
        "id": next_id(items),
        "provider": appt.get("provider"),
        "type": appt.get("type"),
        "date": appt.get("date"),
        "time": appt.get("time"),
        "location": appt.get("location"),
        "cost_usd": appt.get("cost_usd"),
        "status": "scheduled",
        "notes": appt.get("notes"),
    }
    items = items + [entry]
    save(items)
    return {"items": items, "changes": {"added": [entry]}}


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: appointments.py list | appointments.py update '<text>'"}))
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
