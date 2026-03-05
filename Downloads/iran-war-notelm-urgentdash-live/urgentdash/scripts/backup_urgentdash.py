#!/usr/bin/env python
"""Back up urgentdash real-time snapshot using iran-war-notelm storage layout.

Uses the same STORAGE_ROOT, ensure_layout, save_json, append_jsonl as the monitor.
Output: storage/urgentdash_snapshots/YYYY-MM-DD/HH-00.json and daily .jsonl.

Usage:
  1. Export urgentdash data to JSON (see dashboard_bundle/docs/URGENTDASH_BACKUP.md).
  2. python dashboard_bundle/scripts/backup_urgentdash.py [path/to/snapshot.json]
     Default input: dashboard_bundle/ui/urgentdash_snapshot.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

def _repo_root() -> Path:
    here = Path(__file__).resolve()
    for base in [here.parent, *here.parents]:
        if (base / "src").is_dir() and (base / "main.py").exists():
            return base
    return here.parents[2]


ROOT = _repo_root()
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
if str(ROOT / "src") not in sys.path:
    sys.path.insert(0, str(ROOT / "src"))

from src.iran_monitor.config import settings
from src.iran_monitor.storage import append_jsonl, ensure_layout, iso_now, save_json

REQUIRED_SNAPSHOT_KEYS = {"intel_feed", "indicators", "hypotheses", "routes", "checklist"}


def _storage_root() -> Path:
    base = Path(settings.STORAGE_ROOT)
    if base.is_absolute():
        return base
    return (ROOT / base).resolve()


def load_snapshot(path: Path) -> dict:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise ValueError(f"failed to read snapshot file: {path} ({exc})") from exc

    try:
        obj = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"invalid JSON in snapshot file: {path} (line {exc.lineno}, col {exc.colno}: {exc.msg})"
        ) from exc

    if not isinstance(obj, dict):
        raise ValueError("snapshot JSON must be an object with top-level keys")

    missing = sorted(REQUIRED_SNAPSHOT_KEYS - set(obj.keys()))
    if missing:
        keys = ", ".join(missing)
        raise ValueError(f"snapshot JSON missing required top-level key(s): {keys}")

    return obj


def _snapshot_output_paths(root: Path, ts: str) -> tuple[Path, Path]:
    date_part = ts[:10]
    hour_part = ts[11:13] + "-00"
    json_path = root / "urgentdash_snapshots" / date_part / f"{hour_part}.json"
    jsonl_path = root / "urgentdash_snapshots" / f"{date_part}.jsonl"
    return json_path, jsonl_path


def backup_urgentdash(snapshot_path: Path) -> tuple[Path, Path]:
    """Save snapshot to notelm storage layout. Returns (json_path, jsonl_path)."""
    snapshot = load_snapshot(snapshot_path)
    ts = iso_now()
    payload = {"snapshot_ts": ts, **snapshot}

    root = _storage_root()
    ensure_layout(root)
    json_path, jsonl_path = _snapshot_output_paths(root, ts)
    json_path.parent.mkdir(parents=True, exist_ok=True)

    save_json(json_path, payload)
    append_jsonl(jsonl_path, payload)

    return json_path, jsonl_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Back up urgentdash snapshot via notelm storage")
    parser.add_argument(
        "snapshot",
        nargs="?",
        default=str(ROOT / "dashboard_bundle" / "ui" / "urgentdash_snapshot.json"),
        help="Path to urgentdash JSON snapshot (default: dashboard_bundle/ui/urgentdash_snapshot.json)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate snapshot JSON and print output paths without writing files",
    )
    args = parser.parse_args()
    path = Path(args.snapshot)
    if not path.exists():
        print(f"Error: snapshot file not found: {path}", file=sys.stderr)
        print(
            "Export urgentdash data to JSON first (see dashboard_bundle/docs/URGENTDASH_BACKUP.md).",
            file=sys.stderr,
        )
        return 1

    try:
        if args.dry_run:
            _ = load_snapshot(path)
            ts = iso_now()
            root = _storage_root()
            json_path, jsonl_path = _snapshot_output_paths(root, ts)
            print(f"Dry-run OK: {path}")
            print(f"Would save: {json_path}")
            print(f"Would append: {jsonl_path}")
            return 0

        json_path, jsonl_path = backup_urgentdash(path)
        print(f"Saved: {json_path}")
        print(f"Appended: {jsonl_path}")
        return 0
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())


