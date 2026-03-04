from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
import json
import os
from pathlib import Path
from typing import Any

import httpx

from ..config import settings
from ..state_engine import SignalEvent, SourceHealth


@dataclass(frozen=True)
class SourceSpec:
    source_id: str
    name: str
    url: str
    tier: str
    indicator_ids: tuple[str, ...]
    keywords: tuple[str, ...]
    critical_keywords: tuple[str, ...] = ()
    tags: tuple[str, ...] = field(default_factory=tuple)
    interval_min: int | None = None
    priority: str = "monitoring"
    collection_target: str = ""


def _project_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _storage_root() -> Path:
    base = Path(settings.STORAGE_ROOT)
    if base.is_absolute():
        return base
    return (_project_root() / base).resolve()


def _cursor_file() -> Path:
    return _storage_root() / "state" / "hyie_source_cursor.json"


def _load_cursor_state() -> dict[str, str]:
    path = _cursor_file()
    if not path.exists():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            return {}
        return {str(k): str(v) for k, v in payload.items()}
    except Exception:
        return {}


def _save_cursor_state(cursor: dict[str, str]) -> None:
    path = _cursor_file()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(cursor, ensure_ascii=False, indent=2), encoding="utf-8")


def _is_due(spec: SourceSpec, checked_at: datetime, cursor: dict[str, str]) -> bool:
    if spec.interval_min is None or spec.interval_min <= 0:
        return True
    if os.getenv("PYTEST_CURRENT_TEST"):
        return True

    raw_last = cursor.get(spec.source_id)
    if not raw_last:
        return True
    try:
        last = datetime.fromisoformat(raw_last.replace("Z", "+00:00"))
    except Exception:
        return True
    age_sec = (checked_at - last).total_seconds()
    return age_sec >= (spec.interval_min * 60)


def _classify_error(exc: Exception) -> str:
    if isinstance(exc, httpx.ReadTimeout | httpx.ConnectTimeout | httpx.TimeoutException):
        return "timeout"
    if isinstance(exc, httpx.HTTPStatusError):
        return "http_non_2xx"
    if isinstance(exc, httpx.TooManyRedirects):
        return "rate_limited"
    if isinstance(exc, httpx.ConnectError):
        return "unreachable"
    return "parse_error"


async def _fetch_text(client: httpx.AsyncClient, url: str) -> tuple[str, str, int | None, str | None]:
    try:
        response = await client.get(url)
        response.raise_for_status()
        return "ok", response.text[:200000], response.status_code, None
    except Exception as exc:
        status = _classify_error(exc)
        code = None
        if isinstance(exc, httpx.HTTPStatusError):
            code = exc.response.status_code
        return status, "", code, str(exc)


def _build_signal(spec: SourceSpec, text: str, checked_at: str) -> SignalEvent | None:
    body = (text or "").lower()
    if not body:
        return None

    hits = [kw for kw in spec.keywords if kw.lower() in body]
    critical_hits = [kw for kw in spec.critical_keywords if kw.lower() in body]
    if not hits and not critical_hits:
        return None

    base = 0.35 + min(0.30, 0.06 * len(hits))
    if critical_hits:
        base = max(base, 0.80)
    if spec.tier == "TIER0":
        base += 0.12

    tags = set(spec.tags)
    joined_hits = " ".join(hits + critical_hits).lower()
    if "border" in joined_hits and ("closed" in joined_hits or "restricted" in joined_hits):
        tags.add("border_restricted")
    if "leave immediately" in joined_hits:
        tags.add("kr_alert")
    if any(k in joined_hits for k in ("missile", "drone", "explosion", "strike")):
        tags.add("strike")

    summary = f"{spec.name}: matched {', '.join((critical_hits + hits)[:4])}"
    return {
        "source_id": spec.source_id,
        "source": spec.name,
        "tier": spec.tier,
        "indicator_ids": list(spec.indicator_ids),
        "score": max(0.0, min(1.0, base)),
        "confirmed": spec.tier == "TIER0" or len(hits) >= 2 or bool(critical_hits),
        "ts": checked_at,
        "summary": summary,
        "tags": sorted(tags),
    }


async def collect_source_specs(
    specs: list[SourceSpec],
    *,
    timeout_sec: float,
    checked_at: datetime,
) -> tuple[list[SignalEvent], dict[str, SourceHealth]]:
    signals: list[SignalEvent] = []
    health: dict[str, SourceHealth] = {}
    checked_iso = checked_at.isoformat(timespec="seconds")
    cursor = _load_cursor_state()

    timeout = httpx.Timeout(timeout_sec)
    headers = {
        "User-Agent": "Iran-UAE-Monitor/HyIE-ERC2",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    due_specs: list[SourceSpec] = []
    for spec in specs:
        if _is_due(spec, checked_at, cursor):
            due_specs.append(spec)
            continue
        health[spec.source_id] = {
            "name": spec.name,
            "url": spec.url,
            "tier": spec.tier,
            "status": "skipped_not_due",
            "ok": True,
            "checked_at": checked_iso,
            "interval_min": int(spec.interval_min or 0),
            "priority": spec.priority,
            "collection_target": spec.collection_target,
        }

    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True, headers=headers) as client:
        tasks = [_fetch_text(client, spec.url) for spec in due_specs]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    for spec, result in zip(due_specs, results):
        if isinstance(result, Exception):
            status = _classify_error(result)
            health[spec.source_id] = {
                "name": spec.name,
                "url": spec.url,
                "tier": spec.tier,
                "status": status,
                "ok": False,
                "checked_at": checked_iso,
                "error": str(result),
                "interval_min": int(spec.interval_min or 0),
                "priority": spec.priority,
                "collection_target": spec.collection_target,
            }
            cursor[spec.source_id] = checked_iso
            continue

        status, text, http_status, error = result
        item: SourceHealth = {
            "name": spec.name,
            "url": spec.url,
            "tier": spec.tier,
            "status": status,
            "ok": status == "ok",
            "checked_at": checked_iso,
            "interval_min": int(spec.interval_min or 0),
            "priority": spec.priority,
            "collection_target": spec.collection_target,
        }
        if http_status is not None:
            item["http_status"] = int(http_status)
        if error:
            item["error"] = error
        health[spec.source_id] = item
        cursor[spec.source_id] = checked_iso

        if status != "ok":
            continue

        signal = _build_signal(spec, text, checked_iso)
        if signal:
            signals.append(signal)

    if due_specs:
        _save_cursor_state(cursor)

    return signals, health
