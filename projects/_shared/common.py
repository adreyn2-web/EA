#!/usr/bin/env python3
"""
Shared helpers for Compass's data tools (health, meal-plan, journal): JSON storage,
id generation, and the "stream a prompt to Claude, parse strict JSON, retry once on
a bad parse" pattern several tools rely on. `anthropic` is imported lazily inside
stream_json so tools that only touch storage (e.g. track.py's non-chat commands)
don't pay for it.
"""

from __future__ import annotations

import json
import os
import uuid
from pathlib import Path


def load_json(path: Path, default=None):
    if not path.exists():
        return [] if default is None else default
    with open(path) as f:
        return json.load(f)


def save_json(path: Path, data, mode: int | None = None):
    if mode is not None:
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, mode)
        with os.fdopen(fd, "w") as f:
            json.dump(data, f, indent=2)
    else:
        with open(path, "w") as f:
            json.dump(data, f, indent=2)


def next_id(items: list[dict], prefix: str) -> str:
    existing = {i.get("id") for i in items}
    while True:
        candidate = f"{prefix}_{uuid.uuid4().hex[:8]}"
        if candidate not in existing:
            return candidate


def strip_fences(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    return raw


def stream_json(prompt: str, system: str, max_tokens: int = 1024, retry: bool = False) -> dict:
    import anthropic

    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    raw = ""
    with client.messages.stream(
        model="claude-opus-4-8",
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for chunk in stream.text_stream:
            raw += chunk

    try:
        return json.loads(strip_fences(raw))
    except json.JSONDecodeError:
        if not retry:
            return stream_json(prompt, system, max_tokens, retry=True)
        raise
