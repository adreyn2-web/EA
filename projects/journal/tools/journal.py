#!/usr/bin/env python3
"""
Personal journal log. Append-only — entries are never edited or rewritten once
saved, same philosophy as decisions/log.md. Entries come from either the
dashboard's Journal tab or a chat conversation.

Reads/writes projects/journal/data/entries.json:
[
  {"id": "jrn_a1b2c3d4", "timestamp": "2026-07-22T14:03:00", "source": "chat",
   "text": "..."}
]
"""

from __future__ import annotations

import json
import sys
import uuid
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent.parent
DATA_DIR = ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)
ENTRIES_PATH = DATA_DIR / "entries.json"

SOURCES = ["chat", "dashboard"]


def load() -> list[dict]:
    if not ENTRIES_PATH.exists():
        return []
    with open(ENTRIES_PATH) as f:
        return json.load(f)


def save(entries: list[dict]):
    with open(ENTRIES_PATH, "w") as f:
        json.dump(entries, f, indent=2)


def next_id(entries: list[dict]) -> str:
    existing = {e.get("id") for e in entries}
    while True:
        candidate = f"jrn_{uuid.uuid4().hex[:8]}"
        if candidate not in existing:
            return candidate


def add_entry(text: str, source: str = "chat") -> dict:
    if source not in SOURCES:
        source = "chat"
    entries = load()
    entry = {
        "id": next_id(entries),
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "source": source,
        "text": text,
    }
    entries.append(entry)
    save(entries)
    return entry


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: journal.py list | journal.py add '<text>' [source]"}))
        sys.exit(1)

    cmd = sys.argv[1]
    try:
        if cmd == "list":
            print(json.dumps(load()))
        elif cmd == "add":
            if len(sys.argv) < 3:
                print(json.dumps({"error": "add requires text"}))
                sys.exit(1)
            source = sys.argv[3] if len(sys.argv) > 3 else "chat"
            print(json.dumps(add_entry(sys.argv[2], source)))
        else:
            print(json.dumps({"error": f"Unknown command: {cmd}"}))
            sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
